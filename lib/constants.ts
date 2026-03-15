export const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const MEAL_OPTIONS = [
  { dayOfWeek: 0, mealSlot: "DINNER", label: "Monday Dinner" },
  { dayOfWeek: 1, mealSlot: "DINNER", label: "Tuesday Dinner" },
  { dayOfWeek: 2, mealSlot: "DINNER", label: "Wednesday Dinner" },
  { dayOfWeek: 3, mealSlot: "DINNER", label: "Thursday Dinner" },
  { dayOfWeek: 4, mealSlot: "DINNER", label: "Friday Dinner" },
  { dayOfWeek: 5, mealSlot: "LUNCH", label: "Saturday Lunch" },
  { dayOfWeek: 5, mealSlot: "DINNER", label: "Saturday Dinner" },
  { dayOfWeek: 6, mealSlot: "LUNCH", label: "Sunday Lunch" },
  { dayOfWeek: 6, mealSlot: "DINNER", label: "Sunday Dinner" },
] as const;

export const DEFAULT_USER_EMAILS = {
  ELIM: "elim@mealplanner.local",
  THOMAS: "thomas@mealplanner.local",
} as const;
