import fs from "node:fs";
import * as XLSX from "xlsx";

const source = process.argv[2];
const seed = JSON.parse(fs.readFileSync("public/seed-sales.json", "utf8")).records;
const clean = (value) => String(value ?? "").trim().replace(/[^\p{L}\p{N}.-]+/gu, "-").slice(0, 80);
const fingerprint = (record) => [record.documentId, record.productCode, record.quantity, record.sale, record.cost].map(clean).join("_");
const known = new Set(seed.map(fingerprint));
const workbook = XLSX.read(fs.readFileSync(source), { type: "buffer", cellDates: false });
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, raw: true, defval: "" });
let documentId = "";
let items = 0;
let newCount = 0;
for (const row of rows.slice(1)) {
  const first = String(row[0] ?? "");
  if (first.startsWith("Nota:")) {
    documentId = first.match(/ID:\s*(\S+)\s*$/)?.[1] ?? "";
    continue;
  }
  if (!documentId || !String(row[2] ?? "").trim() || String(row[3] ?? "").includes("T O T A L")) continue;
  items += 1;
  const record = { documentId, productCode: String(row[2]).trim(), quantity: Number(row[4]) || 0, sale: Number(row[5]) || 0, cost: Number(row[6]) || 0, tableDiffTotal: Number(row[17]) || 0 };
  if (!known.has(fingerprint(record))) newCount += 1;
}
console.log(JSON.stringify({ items, newCount }));
if (items !== 2221 || newCount !== 0) process.exitCode = 1;
