from __future__ import annotations

import json
import re
from collections import Counter
from datetime import date, datetime
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "PFP_Workplan_Progress_til_June_2026.xlsx"
OUTPUT = ROOT / "lib" / "workplan-data.json"


def clean(value):
    if value is None:
        return ""
    if isinstance(value, (datetime, date)):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str):
        return re.sub(r"[ \t]+", " ", value.replace("\u2029", "\n")).strip()
    return value


def status_key(value: str) -> str:
    text = value.casefold().strip()
    if not text:
        return "not_reported"
    if "дууссан" in text or "complete" in text:
        return "completed"
    if "хойшилсон" in text or "delay" in text:
        return "delayed"
    if "хүлээгд" in text or "hold" in text or "rescheduled" in text:
        return "on_hold"
    if "хийгдэж" in text or "in progress" in text or "started" in text:
        return "in_progress"
    if "эхлээгүй" in text or "not started" in text or "ii хагаст" in text:
        return "not_started"
    return "not_reported"


def average_progress(statuses: list[str]) -> int:
    weights = {
        "completed": 100,
        "in_progress": 55,
        "delayed": 35,
        "on_hold": 20,
        "not_started": 0,
        "not_reported": 0,
    }
    if not statuses:
        return 0
    return round(sum(weights.get(status, 0) for status in statuses) / len(statuses))


workbook = openpyxl.load_workbook(SOURCE, data_only=True, read_only=False)
plan_sheet = workbook["WP 2026 for Board&TCC"]
progress_sheet = workbook["WORKPLAN PROGRESS up to June 01"]

nodes: dict[str, dict] = {}
activities: list[dict] = []
activity_by_code: dict[str, dict] = {}

for row in range(16, plan_sheet.max_row + 1):
    uid = clean(plan_sheet.cell(row, 1).value)
    level = clean(plan_sheet.cell(row, 2).value)
    if not uid or not level:
        continue

    record = {
        "uid": str(uid),
        "level": level,
        "parentUid": clean(plan_sheet.cell(row, 3).value),
        "priority": clean(plan_sheet.cell(row, 4).value),
        "goal": clean(plan_sheet.cell(row, 5).value),
        "planCode": clean(plan_sheet.cell(row, 6).value),
        "code": clean(plan_sheet.cell(row, 7).value),
        "title": clean(plan_sheet.cell(row, 8).value),
        "description": clean(plan_sheet.cell(row, 9).value),
        "baseline": clean(plan_sheet.cell(row, 10).value),
        "target": clean(plan_sheet.cell(row, 11).value),
        "rawStatus": clean(plan_sheet.cell(row, 12).value),
        "actionPlan": clean(plan_sheet.cell(row, 13).value),
        "budgetMntMillion": clean(plan_sheet.cell(row, 14).value),
        "workstream": clean(plan_sheet.cell(row, 15).value),
        "lead": clean(plan_sheet.cell(row, 16).value),
        "technicalLead": clean(plan_sheet.cell(row, 17).value),
        "support": clean(plan_sheet.cell(row, 18).value),
        "partners": clean(plan_sheet.cell(row, 19).value),
        "startDate": clean(plan_sheet.cell(row, 20).value),
        "endDate": clean(plan_sheet.cell(row, 21).value),
        "sourceRow": row,
    }
    node_key = f"{uid}-{row}" if uid in nodes else str(uid)
    nodes[node_key] = record

    if level == "Main Activity":
        code = str(record["code"] or "").strip()
        activity_key = code or f"{uid}-row-{row}"
        record.update(
            {
                "id": activity_key,
                "status": status_key(str(record["rawStatus"])),
                "titleMn": "",
                "progressSummary": "",
                "ministrySupport": "",
                "subactivities": [],
            }
        )
        activities.append(record)
        if code and code not in activity_by_code:
            activity_by_code[code] = record


# Resolve the hierarchy from the parent UIDs in the source sheet.
first_node_by_uid: dict[str, dict] = {}
for node in nodes.values():
    first_node_by_uid.setdefault(str(node["uid"]), node)

for activity in activities:
    objective = first_node_by_uid.get(str(activity["parentUid"]))
    strategic_area = (
        first_node_by_uid.get(str(objective["parentUid"])) if objective else None
    )
    portfolio = (
        first_node_by_uid.get(str(strategic_area["parentUid"]))
        if strategic_area
        else None
    )
    activity["objective"] = (
        {"id": objective["uid"], "code": objective["code"], "title": objective["title"]}
        if objective
        else None
    )
    activity["strategicArea"] = (
        {
            "id": strategic_area["uid"],
            "code": strategic_area["code"],
            "title": strategic_area["title"],
        }
        if strategic_area
        else None
    )
    activity["portfolio"] = (
        {"id": portfolio["uid"], "code": portfolio["code"], "title": portfolio["title"]}
        if portfolio
        else None
    )


current_activity: dict | None = None
for row in range(4, progress_sheet.max_row + 1):
    uid = str(clean(progress_sheet.cell(row, 1).value))
    code = str(clean(progress_sheet.cell(row, 7).value))
    title = clean(progress_sheet.cell(row, 8).value)
    raw_status = str(clean(progress_sheet.cell(row, 14).value))

    if uid.startswith("ACT"):
        current_activity = activity_by_code.get(code)
        if current_activity is None:
            current_activity = next(
                (item for item in activities if item["uid"] == uid), None
            )
        if current_activity:
            current_activity["titleMn"] = title
            current_activity["progressStartDate"] = clean(
                progress_sheet.cell(row, 12).value
            )
            current_activity["progressEndDate"] = clean(
                progress_sheet.cell(row, 13).value
            )
            if raw_status:
                current_activity["rawStatus"] = raw_status
                current_activity["status"] = status_key(raw_status)
        continue

    if uid or not title or current_activity is None:
        continue

    sub_id = f"{current_activity['id']}-sub-{row}"
    current_activity["subactivities"].append(
        {
            "id": sub_id,
            "activityId": current_activity["id"],
            "title": title,
            "progressSummary": clean(progress_sheet.cell(row, 9).value),
            "owner": clean(progress_sheet.cell(row, 10).value),
            "executor": clean(progress_sheet.cell(row, 11).value),
            "startDate": clean(progress_sheet.cell(row, 12).value),
            "endDate": clean(progress_sheet.cell(row, 13).value),
            "rawStatus": raw_status,
            "status": status_key(raw_status),
            "ministrySupport": clean(progress_sheet.cell(row, 15).value),
            "sourceRow": row,
        }
    )


for activity in activities:
    sub_statuses = [item["status"] for item in activity["subactivities"]]
    if sub_statuses:
        counts = Counter(sub_statuses)
        if counts["delayed"]:
            activity["status"] = "delayed"
        elif counts["completed"] == len(sub_statuses):
            activity["status"] = "completed"
        elif counts["in_progress"] or counts["completed"]:
            activity["status"] = "in_progress"
        elif counts["on_hold"]:
            activity["status"] = "on_hold"
        elif counts["not_started"]:
            activity["status"] = "not_started"
        activity["progress"] = average_progress(sub_statuses)
    else:
        activity["progress"] = average_progress([activity["status"]])


payload = {
    "meta": {
        "title": "PFP 2026 Workplan Monitor",
        "source": SOURCE.name,
        "reportingDate": "2026-06-30",
        "activityCount": len(activities),
        "subactivityCount": sum(len(item["subactivities"]) for item in activities),
        "strategicAreaCount": len(
            {item["strategicArea"]["id"] for item in activities if item["strategicArea"]}
        ),
    },
    "activities": activities,
}

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(payload["meta"], ensure_ascii=False))
