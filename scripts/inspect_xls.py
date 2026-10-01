from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import xlrd


def normalize(value):
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


path = Path(sys.argv[1])
book = xlrd.open_workbook(path)
result = {"file": str(path), "sheets": []}

for sheet in book.sheets():
    rows = []
    for row_idx in range(min(sheet.nrows, 15)):
        row = []
        for col_idx in range(sheet.ncols):
            cell = sheet.cell(row_idx, col_idx)
            value = cell.value
            if cell.ctype == xlrd.XL_CELL_DATE:
                value = xlrd.xldate_as_datetime(value, book.datemode).isoformat()
            row.append(normalize(value))
        rows.append(row)

    result["sheets"].append(
        {
            "name": sheet.name,
            "nrows": sheet.nrows,
            "ncols": sheet.ncols,
            "preview": rows,
        }
    )

print(json.dumps(result, ensure_ascii=False, indent=2))
