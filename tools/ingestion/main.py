from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Set

from openpyxl import load_workbook
from pydantic import BaseModel, Field

DAY_MAP = {
    "mon": 0,
    "monday": 0,
    "tue": 1,
    "tues": 1,
    "tuesday": 1,
    "wed": 2,
    "wednesday": 2,
    "thu": 3,
    "thur": 3,
    "thurs": 3,
    "thursday": 3,
    "fri": 4,
    "friday": 4,
    "sat": 5,
    "saturday": 5,
    "sun": 6,
    "sunday": 6,
}

PERSON_MAP = {
    "elim": "ELIM",
    "thomas": "THOMAS",
    "toto": "THOMAS",
}


class ImportedRecipe(BaseModel):
    name: str
    defaultPortion: int = 4
    ingredients: List[str] = Field(default_factory=list)


class ImportedEntry(BaseModel):
    dayOfWeek: int
    mealSlot: str = "DINNER"
    recipeName: Optional[str] = None
    assignedCook: Optional[str] = None
    isEatOut: bool = False
    notes: Optional[str] = None


class ImportedPlan(BaseModel):
    weekLabel: str
    entries: List[ImportedEntry]


class ImportReport(BaseModel):
    sheetsRead: int
    rowsConsidered: int
    rowsImported: int
    rowsSkipped: int
    skippedReasons: Dict[str, int]


class ImportPayload(BaseModel):
    report: ImportReport
    recipes: List[ImportedRecipe]
    historicalPlans: List[ImportedPlan]


@dataclass
class ParserState:
    rows_considered: int = 0
    rows_imported: int = 0
    rows_skipped: int = 0
    skipped_reasons: Dict[str, int] = None

    def __post_init__(self) -> None:
        if self.skipped_reasons is None:
            self.skipped_reasons = defaultdict(int)

    def skip(self, reason: str) -> None:
        self.rows_skipped += 1
        self.skipped_reasons[reason] += 1



def norm(text: object) -> str:
    if text is None:
        return ""
    return str(text).strip()



def parse_day(day_text: str) -> Optional[int]:
    token = re.sub(r"[^a-zA-Z]", "", day_text.lower())
    if not token:
        return None
    return DAY_MAP.get(token)



def parse_person(person_text: str) -> Optional[str]:
    lowered = person_text.lower()
    for key, value in PERSON_MAP.items():
        if key in lowered:
            return value
    return None



def looks_like_out(recipe_text: str) -> bool:
    lowered = recipe_text.lower()
    return "out" in lowered or "date" in lowered



def split_ingredients(raw: str) -> List[str]:
    items = [part.strip() for part in re.split(r"\+|,|/", raw) if part.strip()]
    unique: List[str] = []
    seen: Set[str] = set()
    for item in items:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique[:8]



def parse_recipe_bank_sheet(sheet, recipes: Dict[str, ImportedRecipe], state: ParserState) -> None:
    for row_idx in range(2, 60):
        recipe_name = norm(sheet[f"A{row_idx}"].value)
        veg_col = norm(sheet[f"B{row_idx}"].value)
        portion_raw = sheet[f"C{row_idx}"].value
        if not recipe_name:
            continue

        if recipe_name.lower() in {"meat", "recipe"}:
            continue

        portion = 4
        try:
            if portion_raw is not None:
                portion = int(float(portion_raw))
        except (TypeError, ValueError):
            portion = 4

        recipe = ImportedRecipe(name=recipe_name, defaultPortion=portion, ingredients=split_ingredients(veg_col))
        recipes[recipe_name.lower()] = recipe
        state.rows_imported += 1



def parse_historical_sheet(sheet, recipes: Dict[str, ImportedRecipe], state: ParserState) -> Optional[ImportedPlan]:
    entries: List[ImportedEntry] = []

    for row_idx in range(1, 80):
        state.rows_considered += 1
        day_raw = norm(sheet[f"B{row_idx}"].value)
        recipe_raw = norm(sheet[f"C{row_idx}"].value)
        cook_raw = norm(sheet[f"D{row_idx}"].value)

        if not day_raw and not recipe_raw:
            continue

        day = parse_day(day_raw)
        if day is None:
            state.skip("missing_day")
            continue

        if not recipe_raw:
            state.skip("missing_recipe")
            continue

        is_out = looks_like_out(recipe_raw)
        assigned = parse_person(cook_raw)
        notes = recipe_raw if is_out else None

        recipe_name = None
        if not is_out:
            recipe_name = recipe_raw
            key = recipe_name.lower()
            if key not in recipes:
                recipes[key] = ImportedRecipe(name=recipe_name, defaultPortion=4, ingredients=[])

        entries.append(
            ImportedEntry(
                dayOfWeek=day,
                mealSlot="DINNER",
                recipeName=recipe_name,
                assignedCook=assigned,
                isEatOut=is_out,
                notes=notes,
            )
        )
        state.rows_imported += 1

    if not entries:
        return None

    deduped: Dict[int, ImportedEntry] = {}
    for entry in entries:
        deduped[entry.dayOfWeek] = entry

    return ImportedPlan(weekLabel=sheet.title, entries=list(sorted(deduped.values(), key=lambda e: e.dayOfWeek)))



def import_workbook(workbook_path: Path) -> ImportPayload:
    wb = load_workbook(workbook_path, data_only=True)
    state = ParserState()
    recipes: Dict[str, ImportedRecipe] = {}
    plans: List[ImportedPlan] = []

    for sheet in wb.worksheets:
        title = sheet.title.lower()
        if title == "jan":
            parse_recipe_bank_sheet(sheet, recipes, state)
            continue

        plan = parse_historical_sheet(sheet, recipes, state)
        if plan:
            plans.append(plan)

    report = ImportReport(
        sheetsRead=len(wb.worksheets),
        rowsConsidered=state.rows_considered,
        rowsImported=state.rows_imported,
        rowsSkipped=state.rows_skipped,
        skippedReasons=dict(state.skipped_reasons),
    )

    return ImportPayload(report=report, recipes=list(recipes.values()), historicalPlans=plans)



def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python main.py /path/to/meal-plan.xlsx")

    path = Path(sys.argv[1])
    if not path.exists():
        raise SystemExit(f"Workbook not found: {path}")

    payload = import_workbook(path)
    print(payload.model_dump_json())


if __name__ == "__main__":
    main()
