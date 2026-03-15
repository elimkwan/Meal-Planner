import { CookPerson, MealSlot, Prisma, type Recipe } from "@prisma/client";

interface PlannerInput {
  recipes: Recipe[];
  eatOutOptions: { dayOfWeek: number; mealSlot: MealSlot }[];
  availability: { person: CookPerson; dayOfWeek: number; isOut: boolean }[];
}

function shuffleRecipes(recipes: Recipe[]): Recipe[] {
  const shuffled = [...recipes];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function getIngredientCount(recipe: Recipe): number {
  const ingredients = recipe.ingredients;

  if (Array.isArray(ingredients)) {
    return ingredients.filter((v) => Boolean(String(v).trim())).length;
  }

  if (ingredients && typeof ingredients === "object") {
    return Object.keys(ingredients).length;
  }

  return 0;
}

function getSingleCookRecipeScore(recipe: Recipe): number {
  const ingredientCount = getIngredientCount(recipe);
  const portionPenalty = recipe.defaultPortion <= 2 ? 0 : (recipe.defaultPortion - 2) * 2;
  return portionPenalty + ingredientCount;
}

function buildSingleCookPool(recipes: Recipe[]): Recipe[] {
  if (recipes.length === 0) {
    return [];
  }

  const sorted = [...recipes].sort((a, b) => {
    const scoreDiff = getSingleCookRecipeScore(a) - getSingleCookRecipeScore(b);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return a.name.localeCompare(b.name);
  });

  const preferredCount = Math.max(1, Math.ceil(sorted.length * 0.5));
  return shuffleRecipes(sorted.slice(0, preferredCount));
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
  const eatOut = new Set(input.eatOutOptions.map((option) => `${option.dayOfWeek}-${option.mealSlot}`));
  const shuffledRecipes = shuffleRecipes(input.recipes);
  const singleCookRecipes = buildSingleCookPool(input.recipes);
  const entries: Prisma.PlanEntryCreateManyWeeklyPlanInput[] = [];
  let nextCook: CookPerson = CookPerson.ELIM;
  let recipeIndex = 0;
  let singleCookRecipeIndex = 0;

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
    const out = getOutState(input.availability, dayOfWeek);
    const bothHome = !out.ELIM && !out.THOMAS;
    const bothOut = out.ELIM && out.THOMAS;
    const dayMealSlots = dayOfWeek >= 5 ? [MealSlot.LUNCH, MealSlot.DINNER] : [MealSlot.DINNER];

    for (const mealSlot of dayMealSlots) {
      if (eatOut.has(`${dayOfWeek}-${mealSlot}`)) {
        entries.push({
          dayOfWeek,
          mealSlot,
          isEatOut: true,
          portionCount: 2,
          notes: "Eat out",
        });
        continue;
      }

      if (bothOut) {
        entries.push({
          dayOfWeek,
          mealSlot,
          isEatOut: false,
          portionCount: 1,
          notes: "Both out - self managed",
        });
        continue;
      }

      if (!bothHome) {
        const assignedCook = out.ELIM ? CookPerson.THOMAS : CookPerson.ELIM;
        const pool = singleCookRecipes.length > 0 ? singleCookRecipes : shuffledRecipes;
        const recipe = pool.length > 0 ? pool[singleCookRecipeIndex % pool.length] : null;

        entries.push({
          dayOfWeek,
          mealSlot,
          recipeId: recipe?.id,
          assignedCook,
          isEatOut: false,
          portionCount: 2,
          notes: "One person out - smaller/easier meal",
        });

        singleCookRecipeIndex += 1;
        continue;
      }

      const recipe = shuffledRecipes.length > 0 ? shuffledRecipes[recipeIndex % shuffledRecipes.length] : null;

      entries.push({
        dayOfWeek,
        mealSlot,
        recipeId: recipe?.id,
        assignedCook: nextCook,
        isEatOut: false,
        portionCount: 4,
        notes: "4 portions: 2 dinner + 2 lunchbox",
      });

      recipeIndex += 1;
      nextCook = nextCook === CookPerson.ELIM ? CookPerson.THOMAS : CookPerson.ELIM;
    }
  }

  return entries;
}
