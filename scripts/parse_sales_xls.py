from __future__ import annotations

import json
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

import xlrd


HEADER_RE = re.compile(
    r"Nota:\s*(?P<note>.*?)\s+Pedido:\s*(?P<order>.*?)\s+Data:\s*(?P<date>\d{4}/\d{2}/\d{2})\s+"
    r"Cliente:\s*(?P<client>.*?)\s+CFOP:\s*(?P<cfop>\S+)\s+Pedido Cliente:\s*(?P<customer_order>.*?)\s+ID:\s*(?P<document_id>\S+)\s*$"
)


def number(value):
    if value in (None, ""):
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


source = Path(sys.argv[1])
output = Path(sys.argv[2]) if len(sys.argv) > 2 else None
book = xlrd.open_workbook(source)
sheet = book.sheet_by_index(0)
current = None
records = []
header_failures = []

for row_index in range(1, sheet.nrows):
    first = str(sheet.cell_value(row_index, 0) or "").strip()
    if first.startswith("Nota:"):
        match = HEADER_RE.match(first)
        if not match:
            header_failures.append(first)
            current = None
        else:
            current = match.groupdict()
        continue

    if not current:
        continue

    description = str(sheet.cell_value(row_index, 3) or "").strip()
    product_code = str(sheet.cell_value(row_index, 2) or "").strip()
    if not product_code or "T O T A L" in description:
        continue

    record = {
        "id": f"{current['document_id']}-{row_index}",
        "sourceRow": row_index + 1,
        "note": str(current["note"]).strip(),
        "order": str(current["order"]).strip(),
        "date": datetime.strptime(current["date"], "%Y/%m/%d").date().isoformat(),
        "client": current["client"].strip(),
        "cfop": current["cfop"].strip(),
        "customerOrder": current["customer_order"].strip(),
        "documentId": current["document_id"].strip(),
        "itemOrder": int(number(sheet.cell_value(row_index, 1))),
        "productCode": product_code,
        "product": description,
        "quantity": number(sheet.cell_value(row_index, 4)),
        "sale": number(sheet.cell_value(row_index, 5)),
        "cost": number(sheet.cell_value(row_index, 6)),
        "profitPercentSource": 0,
        "profit": 0,
        "saleShareSource": number(sheet.cell_value(row_index, 9)),
        "profitShareSource": number(sheet.cell_value(row_index, 10)),
        "type": str(sheet.cell_value(row_index, 11) or "").strip(),
        "stock": number(sheet.cell_value(row_index, 12)),
        "unit": str(sheet.cell_value(row_index, 13) or "").strip(),
        "tableUnit": number(sheet.cell_value(row_index, 14)),
        "tableDiffUnit": number(sheet.cell_value(row_index, 15)),
        "tableDiffPercent": number(sheet.cell_value(row_index, 16)),
        "tableDiffTotal": number(sheet.cell_value(row_index, 17)),
    }
    record["profit"] = record["sale"] - record["cost"]
    record["profitPercentSource"] = record["profit"] / record["sale"] if record["sale"] else 0
    table_total = round(record["tableUnit"] * record["quantity"], 2)
    record["tableDiffTotal"] = round(record["sale"] - table_total, 2)
    record["tableDiffUnit"] = record["tableDiffTotal"] / record["quantity"] if record["quantity"] else 0
    record["tableDiffPercent"] = record["tableDiffTotal"] / table_total if table_total else 0
    records.append(record)

sales = sum(r["sale"] for r in records)
cost = sum(r["cost"] for r in records)
profit = sum(r["profit"] for r in records)
summary = {
    "rows": len(records),
    "notes": len({r["documentId"] for r in records}),
    "clients": len({r["client"] for r in records}),
    "dateMin": min(r["date"] for r in records),
    "dateMax": max(r["date"] for r in records),
    "sales": round(sales, 2),
    "cost": round(cost, 2),
    "profit": round(profit, 2),
    "margin": round(profit / sales if sales else 0, 6),
    "belowTable": round(sum(-r["tableDiffTotal"] for r in records if r["tableDiffTotal"] < 0), 2),
    "aboveTable": round(sum(r["tableDiffTotal"] for r in records if r["tableDiffTotal"] > 0), 2),
    "headerFailures": len(header_failures),
    "units": Counter(r["unit"] for r in records).most_common(),
}

payload = {"source": source.name, "importedAt": None, "summary": summary, "records": records}
if output:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(json.dumps(summary, ensure_ascii=False, indent=2))
if header_failures:
    print(json.dumps(header_failures[:5], ensure_ascii=False, indent=2))
