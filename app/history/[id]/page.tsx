import Link from "next/link";
import { notFound } from "next/navigation";

import { DAY_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const plan = await prisma.weeklyPlan.findUnique({
    where: { id },
    include: {
      entries: {
        include: { recipe: true },
        orderBy: { dayOfWeek: "asc" },
      },
      createdBy: true,
    },
  });

  if (!plan) {
    notFound();
  }

  return (
    <div className="stack" style={{ paddingTop: "1rem", paddingBottom: "2rem" }}>
      <section className="card stack">
        <Link href="/history">Back to history</Link>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 800 }}>
          Week of {new Date(plan.weekStartDate).toLocaleDateString()}
        </h1>
        <p className="muted">
          Status: {plan.status} | Created by: {plan.createdBy.name}
        </p>
      </section>

      <section className="card">
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>Meal</th>
              <th>Recipe</th>
              <th>Cook</th>
              <th>Eat out</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {plan.entries.map((entry) => (
              <tr key={entry.id}>
                <td>{DAY_LABELS[entry.dayOfWeek]}</td>
                <td>{entry.mealSlot}</td>
                <td>{entry.recipe?.name ?? "-"}</td>
                <td>{entry.assignedCook ?? "-"}</td>
                <td>{entry.isEatOut ? "Yes" : "No"}</td>
                <td>{entry.notes ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
