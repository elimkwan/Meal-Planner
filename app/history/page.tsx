import Link from "next/link";

import { DAY_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const plans = await prisma.weeklyPlan.findMany({
    orderBy: { weekStartDate: "desc" },
    include: {
      _count: { select: { entries: true } },
      createdBy: true,
    },
  });

  return (
    <div className="stack" style={{ paddingTop: "1rem", paddingBottom: "2rem" }}>
      <section className="card">
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Plan History</h1>
        <p className="muted">Open any week to review meals, cooks, and grocery context.</p>
      </section>

      <section className="card">
        {plans.length === 0 ? (
          <p className="muted">No plans yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Week Start</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Entries</th>
                <th>Eat-out days</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((plan) => {
                const eatOut = Array.isArray(plan.eatOutDays)
                  ? plan.eatOutDays
                      .map((v) => (typeof v === "number" ? DAY_LABELS[v] : null))
                      .filter(Boolean)
                      .join(", ")
                  : "";
                return (
                  <tr key={plan.id}>
                    <td>{new Date(plan.weekStartDate).toLocaleDateString()}</td>
                    <td>{plan.status}</td>
                    <td>{plan.createdBy.name}</td>
                    <td>{plan._count.entries}</td>
                    <td>{eatOut || "-"}</td>
                    <td>
                      <Link href={`/history/${plan.id}`}>Open</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
