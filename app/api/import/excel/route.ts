import { spawnSync } from "node:child_process";
import path from "node:path";

import { CookPerson } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { getUserIdForPerson } from "@/lib/default-users";
import { prisma } from "@/lib/prisma";
import { importExcelSchema } from "@/lib/validation";

interface ImportedRecipe {
  name: string;
  defaultPortion: number;
  ingredients: string[];
}

interface ImportedEntry {
  dayOfWeek: number;
  mealSlot: "DINNER" | "LUNCH";
  recipeName?: string;
  assignedCook?: "ELIM" | "THOMAS";
  isEatOut: boolean;
  notes?: string;
}

interface ImportedPlan {
  weekLabel: string;
  entries: ImportedEntry[];
}

interface ImportPayload {
  report: Record<string, unknown>;
  recipes: ImportedRecipe[];
  historicalPlans: ImportedPlan[];
}

export async function POST(request: NextRequest) {
  const payload = importExcelSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const data = payload.data;
  const uvBin = process.env.UV_BIN ?? path.join(process.env.HOME ?? "", ".local/bin/uv");
  const ingestionCwd = path.join(process.cwd(), "tools/ingestion");
  const workbookPath = path.isAbsolute(data.workbookPath)
    ? data.workbookPath
    : path.resolve(process.cwd(), data.workbookPath);

  const cmd = spawnSync(uvBin, ["run", "python", "main.py", workbookPath], {
    cwd: ingestionCwd,
    encoding: "utf8",
  });

  if (cmd.status !== 0) {
    return NextResponse.json(
      {
        error: "Ingestion failed",
        details: cmd.stderr || cmd.stdout,
      },
      { status: 500 },
    );
  }

  const parsed = JSON.parse(cmd.stdout) as ImportPayload;
  if (data.dryRun) {
    return NextResponse.json(parsed);
  }

  for (const recipe of parsed.recipes) {
    await prisma.recipe.upsert({
      where: { name: recipe.name },
      update: {
        ingredients: recipe.ingredients,
        defaultPortion: recipe.defaultPortion || 4,
      },
      create: {
        name: recipe.name,
        ingredients: recipe.ingredients,
        defaultPortion: recipe.defaultPortion || 4,
      },
    });
  }

  const createdById = await getUserIdForPerson(data.createdByPerson as CookPerson);

  for (const [offset, importedPlan] of parsed.historicalPlans.entries()) {
    const weekStartDate = new Date();
    weekStartDate.setDate(weekStartDate.getDate() - offset * 7);

    const createdPlan = await prisma.weeklyPlan.create({
      data: {
        weekStartDate,
        status: "FINAL",
        eatOutDays: importedPlan.entries.filter((e) => e.isEatOut).map((e) => e.dayOfWeek),
        createdById,
      },
    });

    for (const entry of importedPlan.entries) {
      const recipe = entry.recipeName
        ? await prisma.recipe.findUnique({ where: { name: entry.recipeName } })
        : null;

      await prisma.planEntry.upsert({
        where: {
          weeklyPlanId_dayOfWeek_mealSlot: {
            weeklyPlanId: createdPlan.id,
            dayOfWeek: entry.dayOfWeek,
            mealSlot: entry.mealSlot,
          },
        },
        update: {
          recipeId: recipe?.id,
          assignedCook: entry.assignedCook,
          isEatOut: entry.isEatOut,
          notes: entry.notes,
        },
        create: {
          weeklyPlanId: createdPlan.id,
          dayOfWeek: entry.dayOfWeek,
          mealSlot: entry.mealSlot,
          recipeId: recipe?.id,
          assignedCook: entry.assignedCook,
          isEatOut: entry.isEatOut,
          notes: entry.notes,
        },
      });
    }
  }

  return NextResponse.json({
    report: parsed.report,
    importedRecipes: parsed.recipes.length,
    importedPlans: parsed.historicalPlans.length,
  });
}
