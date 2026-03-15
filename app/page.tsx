"use client";

import { CookPerson, PlanStatus, type PlanEntry, type Recipe, type WeeklyPlan } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";

import { DAY_LABELS, MEAL_OPTIONS } from "@/lib/constants";

type PlanWithEntries = WeeklyPlan & { entries: (PlanEntry & { recipe: Recipe | null })[] };

interface AvailabilityDraft {
  dayOfWeek: number;
  elimOut: boolean;
  thomasOut: boolean;
}

const getMealOptionKey = (option: { dayOfWeek: number; mealSlot: "LUNCH" | "DINNER" }) =>
  `${option.dayOfWeek}-${option.mealSlot}`;

const emptyAvailability = DAY_LABELS.map((_, dayOfWeek) => ({
  dayOfWeek,
  elimOut: false,
  thomasOut: false,
}));

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [weekStartDate, setWeekStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [eatOutOptions, setEatOutOptions] = useState<string[]>(["4-DINNER", "5-DINNER"]);
  const [availability, setAvailability] = useState<AvailabilityDraft[]>(emptyAvailability);
  const [createdByPerson, setCreatedByPerson] = useState<CookPerson>(CookPerson.ELIM);
  const [plan, setPlan] = useState<PlanWithEntries | null>(null);
  const [groceries, setGroceries] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/recipes");
      const payload = await response.json();
      setRecipes(payload.recipes ?? []);
    };

    void load();
  }, []);

  const availabilityPayload = useMemo(
    () =>
      availability.flatMap((day) => [
        { person: CookPerson.ELIM, dayOfWeek: day.dayOfWeek, isOut: day.elimOut },
        { person: CookPerson.THOMAS, dayOfWeek: day.dayOfWeek, isOut: day.thomasOut },
      ]),
    [availability],
  );

  const toggleEatOut = (optionKey: string) => {
    setEatOutOptions((prev) => {
      const has = prev.includes(optionKey);
      if (has) {
        return prev.filter((v) => v !== optionKey);
      }

      if (prev.length >= 2) {
        return [prev[1], optionKey];
      }

      return [...prev, optionKey];
    });
  };

  const updateEntry = (id: string, patch: Partial<PlanEntry>) => {
    setPlan((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        entries: current.entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
      };
    });
  };

  const generatePlan = async () => {
    setStatusMessage("Generating plan...");
    const response = await fetch("/api/plans/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStartDate: `${weekStartDate}T00:00:00.000Z`,
        eatOutOptions: MEAL_OPTIONS.filter((option) =>
          eatOutOptions.includes(getMealOptionKey(option)),
        ).map((option) => ({
          dayOfWeek: option.dayOfWeek,
          mealSlot: option.mealSlot,
        })),
        availability: availabilityPayload,
        createdByPerson,
      }),
    });

    if (!response.ok) {
      setStatusMessage("Failed to generate plan.");
      return;
    }

    const payload = (await response.json()) as { plan: PlanWithEntries };
    setPlan(payload.plan);
    setStatusMessage("Plan generated.");
    await loadGroceries(payload.plan.id);
  };

  const loadGroceries = async (planId: string) => {
    const response = await fetch(`/api/plans/${planId}/groceries`);
    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { groceries: string[] };
    setGroceries(payload.groceries);
  };

  const savePlan = async (status?: PlanStatus) => {
    if (!plan) {
      return;
    }

    const response = await fetch(`/api/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        entries: plan.entries.map((entry) => ({
          id: entry.id,
          recipeId: entry.recipeId,
          assignedCook: entry.assignedCook,
          isEatOut: entry.isEatOut,
          notes: entry.notes,
          portionCount: entry.portionCount,
        })),
      }),
    });

    if (!response.ok) {
      setStatusMessage("Failed to save.");
      return;
    }

    const payload = (await response.json()) as { plan: PlanWithEntries };
    setPlan(payload.plan);
    setStatusMessage(status === PlanStatus.FINAL ? "Plan finalized." : "Draft saved.");
    await loadGroceries(payload.plan.id);
  };

  const importWorkbook = async () => {
    setStatusMessage("Importing workbook...");
    const response = await fetch("/api/import/excel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workbookPath: "./data/Meal_Plan.xlsx",
        dryRun: false,
        createdByPerson,
      }),
    });

    if (!response.ok) {
      setStatusMessage("Workbook import failed.");
      return;
    }

    const payload = await response.json();
    setStatusMessage(`Imported ${payload.importedRecipes} recipes and ${payload.importedPlans} plans.`);

    const recipesResponse = await fetch("/api/recipes");
    const recipePayload = await recipesResponse.json();
    setRecipes(recipePayload.recipes ?? []);
  };

  return (
    <div className="stack" style={{ paddingTop: "1rem", paddingBottom: "2rem" }}>
      <section className="card stack">
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Weekly Meal Planner</h1>
        <p className="muted">
          Generate a weekly meal roster, then edit and save it. Rules included: two eat-out options,
          no roster credit when one person is out, and 4 portions for home-cooked meals.
        </p>
        <div className="grid-two">
          <div>
            <label htmlFor="weekStart">Week start date</label>
            <input
              id="weekStart"
              type="date"
              value={weekStartDate}
              onChange={(event) => setWeekStartDate(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="createdBy">Generated by</label>
            <select
              id="createdBy"
              value={createdByPerson}
              onChange={(event) => setCreatedByPerson(event.target.value as CookPerson)}
            >
              <option value={CookPerson.ELIM}>Elim</option>
              <option value={CookPerson.THOMAS}>Thomas</option>
            </select>
          </div>
        </div>

        <div>
          <p style={{ fontWeight: 700, marginBottom: "0.4rem" }}>Eat out options (pick 2)</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {MEAL_OPTIONS.map((option) => {
              const optionKey = getMealOptionKey(option);
              return (
              <button
                key={optionKey}
                type="button"
                className={eatOutOptions.includes(optionKey) ? "" : "secondary"}
                onClick={() => toggleEatOut(optionKey)}
              >
                {option.label}
              </button>
              );
            })}
          </div>
        </div>

        <div className="card">
          <p style={{ fontWeight: 700, marginBottom: "0.4rem" }}>Out-of-home input</p>
          <table>
            <thead>
              <tr>
                <th>Meal option</th>
                <th>Elim out?</th>
                <th>Thomas out?</th>
              </tr>
            </thead>
            <tbody>
              {MEAL_OPTIONS.map((option) => {
                const day = availability[option.dayOfWeek];
                return (
                <tr key={getMealOptionKey(option)}>
                  <td>{option.label}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={day.elimOut}
                      onChange={(event) =>
                        setAvailability((prev) =>
                          prev.map((v) =>
                            v.dayOfWeek === day.dayOfWeek ? { ...v, elimOut: event.target.checked } : v,
                          ),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={day.thomasOut}
                      onChange={(event) =>
                        setAvailability((prev) =>
                          prev.map((v) =>
                            v.dayOfWeek === day.dayOfWeek ? { ...v, thomasOut: event.target.checked } : v,
                          ),
                        )
                      }
                    />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button type="button" onClick={generatePlan}>
            Generate Plan
          </button>
          <button type="button" className="secondary" onClick={importWorkbook}>
            Import Existing Workbook
          </button>
        </div>
        <p className="muted">{statusMessage}</p>
      </section>

      {plan ? (
        <section className="card stack">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Generated Plan</h2>
            <span className="badge">Status: {plan.status}</span>
          </div>
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
                  <td>{entry.mealSlot === "LUNCH" ? "Lunch" : "Dinner"}</td>
                  <td>
                    <select
                      value={entry.recipeId ?? ""}
                      onChange={(event) =>
                        updateEntry(entry.id, {
                          recipeId: event.target.value || null,
                        })
                      }
                    >
                      <option value="">No recipe</option>
                      {recipes.map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={entry.assignedCook ?? ""}
                      onChange={(event) =>
                        updateEntry(entry.id, {
                          assignedCook: (event.target.value || null) as CookPerson | null,
                        })
                      }
                    >
                      <option value="">None</option>
                      <option value={CookPerson.ELIM}>Elim</option>
                      <option value={CookPerson.THOMAS}>Thomas</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={entry.isEatOut}
                      onChange={(event) => updateEntry(entry.id, { isEatOut: event.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      value={entry.notes ?? ""}
                      onChange={(event) => updateEntry(entry.id, { notes: event.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="secondary" onClick={() => void savePlan()}>
              Save Draft
            </button>
            <button type="button" onClick={() => void savePlan(PlanStatus.FINAL)}>
              Finalize
            </button>
          </div>
        </section>
      ) : null}

      <section className="card">
        <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>Grocery Checklist</h2>
        {groceries.length === 0 ? (
          <p className="muted">No grocery items yet. Generate and save a plan first.</p>
        ) : (
          <ul>
            {groceries.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
