import { CookPerson, MealSlot, PlanStatus } from "@prisma/client";
import { z } from "zod";

export const availabilitySchema = z.object({
  person: z.nativeEnum(CookPerson),
  dayOfWeek: z.number().int().min(0).max(6),
  isOut: z.boolean(),
});

export const generatePlanSchema = z.object({
  weekStartDate: z.string().datetime(),
  eatOutDays: z.array(z.number().int().min(0).max(6)).length(2),
  availability: z.array(availabilitySchema).default([]),
  recipeIds: z.array(z.string().min(1)).optional(),
  createdByPerson: z.nativeEnum(CookPerson).default(CookPerson.ELIM),
});

export const patchPlanSchema = z.object({
  status: z.nativeEnum(PlanStatus).optional(),
  entries: z.array(
    z.object({
      id: z.string().min(1),
      recipeId: z.string().min(1).nullable().optional(),
      assignedCook: z.nativeEnum(CookPerson).nullable().optional(),
      isEatOut: z.boolean().optional(),
      notes: z.string().max(500).nullable().optional(),
      portionCount: z.number().int().min(1).max(10).optional(),
      mealSlot: z.nativeEnum(MealSlot).optional(),
      dayOfWeek: z.number().int().min(0).max(6).optional(),
    }),
  ),
});

export const importExcelSchema = z.object({
  workbookPath: z.string().min(1),
  dryRun: z.boolean().default(false),
  createdByPerson: z.nativeEnum(CookPerson).default(CookPerson.ELIM),
});
