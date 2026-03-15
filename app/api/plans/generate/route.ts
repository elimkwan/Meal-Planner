import { NextRequest, NextResponse } from "next/server";

import { getUserIdForPerson } from "@/lib/default-users";
import { buildPlanEntries } from "@/lib/planner";
import { prisma } from "@/lib/prisma";
import { generatePlanSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const payload = generatePlanSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const data = payload.data;
  const recipes = data.recipeIds?.length
    ? await prisma.recipe.findMany({ where: { id: { in: data.recipeIds } } })
    : await prisma.recipe.findMany({ take: 25, orderBy: { name: "asc" } });

  const createdById = await getUserIdForPerson(data.createdByPerson);
  const entries = buildPlanEntries({
    recipes,
    eatOutDays: data.eatOutDays,
    availability: data.availability,
  });

  const plan = await prisma.weeklyPlan.create({
    data: {
      weekStartDate: new Date(data.weekStartDate),
      eatOutDays: data.eatOutDays,
      createdById,
      availability: {
        create: data.availability,
      },
      entries: {
        createMany: {
          data: entries,
        },
      },
    },
    include: {
      entries: {
        include: { recipe: true },
        orderBy: { dayOfWeek: "asc" },
      },
      availability: true,
    },
  });

  return NextResponse.json({ plan }, { status: 201 });
}
