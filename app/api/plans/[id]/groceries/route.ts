import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const plan = await prisma.weeklyPlan.findUnique({
    where: { id },
    include: {
      entries: {
        include: { recipe: true },
      },
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const items = new Set<string>();
  for (const entry of plan.entries) {
    if (entry.isEatOut || !entry.recipe) {
      continue;
    }

    const ingredients = Array.isArray(entry.recipe.ingredients)
      ? entry.recipe.ingredients
      : [];

    for (const ingredient of ingredients) {
      const label = String(ingredient).trim();
      if (label) {
        items.add(label);
      }
    }
  }

  return NextResponse.json({ groceries: Array.from(items).sort((a, b) => a.localeCompare(b)) });
}
