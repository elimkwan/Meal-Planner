import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const plans = await prisma.weeklyPlan.findMany({
    orderBy: { weekStartDate: "desc" },
    include: {
      createdBy: true,
      _count: {
        select: { entries: true },
      },
    },
  });

  return NextResponse.json({ plans });
}
