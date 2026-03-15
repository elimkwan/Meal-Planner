import { CookPerson, MealSlot, Prisma, type Recipe } from "@prisma/client";

interface PlannerInput {
  recipes: Recipe[];
  eatOutDays: number[];
  availability: { person: CookPerson; dayOfWeek: number; isOut: boolean }[];
}

function getOutState(
  availability: PlannerInput["availability"],
  dayOfWeek: number,
): Record<CookPerson, boolean> {
  const dayRecords = availability.filter((v) => v.dayOfWeek === dayOfWeek && v.isOut);
  return {
    [CookPerson.ELIM]: dayRecords.some((v) => v.person === CookPerson.ELIM),
    [CookPerson.THOMAS]: dayRecords.some((v) => v.person === CookPerson.THOMAS),
  };
}

export function buildPlanEntries(input: PlannerInput): Prisma.PlanEntryCreateManyWeeklyPlanInput[] {
  const eatOut = new Set(input.eatOutDays);
  const entries: Prisma.PlanEntryCreateManyWeeklyPlanInput[] = [];
  let nextCook: CookPerson = CookPerson.ELIM;
  let recipeIndex = 0;

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
    const out = getOutState(input.availability, dayOfWeek);
    const bothHome = !out.ELIM && !out.THOMAS;
    const bothOut = out.ELIM && out.THOMAS;

    if (eatOut.has(dayOfWeek)) {
      entries.push({
        dayOfWeek,
        mealSlot: MealSlot.DINNER,
        isEatOut: true,
        portionCount: 2,
        notes: "Eat out",
      });
      continue;
    }

    if (!bothHome || bothOut) {
      const note = bothOut ? "Both out - self managed" : "One person out - self managed";
      entries.push({
        dayOfWeek,
        mealSlot: MealSlot.DINNER,
        isEatOut: false,
        portionCount: 1,
        notes: note,
      });
      continue;
    }

    const recipe = input.recipes.length > 0 ? input.recipes[recipeIndex % input.recipes.length] : null;

    entries.push({
      dayOfWeek,
      mealSlot: MealSlot.DINNER,
      recipeId: recipe?.id,
      assignedCook: nextCook,
      isEatOut: false,
      portionCount: 4,
      notes: "4 portions: 2 dinner + 2 lunchbox",
    });

    recipeIndex += 1;
    nextCook = nextCook === CookPerson.ELIM ? CookPerson.THOMAS : CookPerson.ELIM;
  }

  return entries;
}
