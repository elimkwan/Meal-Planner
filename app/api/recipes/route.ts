import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const recipes = await prisma.recipe.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ recipes });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = String(body?.name ?? "").trim();
  const ingredients = Array.isArray(body?.ingredients)
    ? body.ingredients.map((v: unknown) => String(v).trim()).filter(Boolean)
    : [];

  if (!name) {
    return NextResponse.json({ error: "Recipe name is required" }, { status: 400 });
  }

  const recipe = await prisma.recipe.upsert({
    where: { name },
    update: {
      ingredients,
    },
    create: {
      name,
      ingredients,
      defaultPortion: 4,
    },
  });

  return NextResponse.json({ recipe }, { status: 201 });
}
