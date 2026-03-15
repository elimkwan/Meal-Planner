-- CreateEnum
CREATE TYPE "public"."CookPerson" AS ENUM ('ELIM', 'THOMAS');

-- CreateEnum
CREATE TYPE "public"."PlanStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "public"."MealSlot" AS ENUM ('DINNER', 'LUNCH');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "person" "public"."CookPerson" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Recipe" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultPortion" INTEGER NOT NULL DEFAULT 4,
    "ingredients" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WeeklyPlan" (
    "id" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "eatOutDays" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PlanEntry" (
    "id" TEXT NOT NULL,
    "weeklyPlanId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "mealSlot" "public"."MealSlot" NOT NULL DEFAULT 'DINNER',
    "recipeId" TEXT,
    "assignedCook" "public"."CookPerson",
    "isEatOut" BOOLEAN NOT NULL DEFAULT false,
    "portionCount" INTEGER NOT NULL DEFAULT 4,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Availability" (
    "id" TEXT NOT NULL,
    "weeklyPlanId" TEXT NOT NULL,
    "person" "public"."CookPerson" NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isOut" BOOLEAN NOT NULL,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_person_key" ON "public"."User"("person");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_name_key" ON "public"."Recipe"("name");

-- CreateIndex
CREATE INDEX "WeeklyPlan_weekStartDate_idx" ON "public"."WeeklyPlan"("weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "PlanEntry_weeklyPlanId_dayOfWeek_mealSlot_key" ON "public"."PlanEntry"("weeklyPlanId", "dayOfWeek", "mealSlot");

-- CreateIndex
CREATE UNIQUE INDEX "Availability_weeklyPlanId_person_dayOfWeek_key" ON "public"."Availability"("weeklyPlanId", "person", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "public"."WeeklyPlan" ADD CONSTRAINT "WeeklyPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlanEntry" ADD CONSTRAINT "PlanEntry_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "public"."WeeklyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PlanEntry" ADD CONSTRAINT "PlanEntry_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "public"."Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Availability" ADD CONSTRAINT "Availability_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "public"."WeeklyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
