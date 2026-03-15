import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { patchPlanSchema } from "@/lib/validation";

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const plan = await prisma.weeklyPlan.findUnique({
    where: { id },
    include: {
      entries: {
        include: { recipe: true },
        orderBy: { dayOfWeek: "asc" },
      },
      availability: true,
      createdBy: true,
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json({ plan });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = patchPlanSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const data = payload.data;

  await prisma.$transaction(async (tx) => {
    if (data.status) {
      await tx.weeklyPlan.update({ where: { id }, data: { status: data.status } });
    }

    for (const entry of data.entries) {
      await tx.planEntry.update({
        where: { id: entry.id },
        data: {
          recipeId: entry.recipeId ?? undefined,
          assignedCook: entry.assignedCook ?? undefined,
          isEatOut: entry.isEatOut,
          notes: entry.notes ?? undefined,
          portionCount: entry.portionCount,
          mealSlot: entry.mealSlot,
          dayOfWeek: entry.dayOfWeek,
        },
      });
    }
  });

  const updated = await prisma.weeklyPlan.findUnique({
    where: { id },
    include: {
      entries: {
        include: { recipe: true },
        orderBy: { dayOfWeek: "asc" },
      },
      availability: true,
      createdBy: true,
    },
  });

  return NextResponse.json({ plan: updated });
}
