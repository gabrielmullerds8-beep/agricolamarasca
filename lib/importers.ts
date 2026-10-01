import type { ImportResult, SaleRecord } from "@/types/sales";
import { withComputedFields } from "@/lib/calculations";

const headerPattern = /Nota:\s*(.*?)\s+Pedido:\s*(.*?)\s+Data:\s*(\d{4}\/\d{2}\/\d{2})\s+Cliente:\s*(.*?)\s+CFOP:\s*(\S+)\s+Pedido Cliente:\s*(.*?)\s+ID:\s*(\S+)\s*$/;

const num = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string" || !value.trim()) return 0;
  const normalized = value.replace(/R\$\s?/g, "").replace(/\./g, "").replace(",", ".").replace("%", "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const text = (value: unknown) => String(value ?? "").trim();
const keyPart = (value: unknown) => text(value).replace(/[^\p{L}\p{N}.-]+/gu, "-").slice(0, 80);

export const recordFingerprint = (record: Pick<SaleRecord, "documentId" | "productCode" | "quantity" | "sale" | "cost">) =>
  [record.documentId, record.productCode, record.quantity, record.sale, record.cost].map(keyPart).join("_");

export async function parseSalesWorkbook(file: File): Promise<ImportResult> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("A planilha não possui uma aba legível.");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, raw: true, defval: "" });
  const records: SaleRecord[] = [];
  const occurrences = new Map<string, number>();
  let current: { note: string; order: string; date: string; client: string; cfop: string; customerOrder: string; documentId: string } | null = null;

  rows.slice(1).forEach((row, index) => {
    const first = text(row[0]);
    if (first.startsWith("Nota:")) {
      const match = first.match(headerPattern);
      if (!match) throw new Error(`Cabeçalho de nota não reconhecido na linha ${index + 2}.`);
      current = {
        note: match[1].trim(), order: match[2].trim(), date: match[3].replaceAll("/", "-"), client: match[4].trim(),
        cfop: match[5].trim(), customerOrder: match[6].trim(), documentId: match[7].trim(),
      };
      return;
    }
    if (!current) return;
    const productCode = text(row[2]);
    const product = text(row[3]);
    if (!productCode || product.includes("T O T A L")) return;
    const baseKey = [current.documentId, productCode, num(row[4]), num(row[5]), num(row[6]), num(row[17])].map(keyPart).join("_");
    const occurrence = (occurrences.get(baseKey) ?? 0) + 1;
    occurrences.set(baseKey, occurrence);
    records.push(withComputedFields({
      id: `${baseKey}_${occurrence}`,
      sourceRow: index + 2,
      ...current,
      itemOrder: Math.trunc(num(row[1])),
      productCode,
      product,
      quantity: num(row[4]),
      sale: num(row[5]),
      cost: num(row[6]),
      profitPercentSource: 0,
      profit: 0,
      saleShareSource: num(row[9]),
      profitShareSource: num(row[10]),
      type: text(row[11]),
      stock: num(row[12]),
      unit: text(row[13]),
      tableUnit: num(row[14]),
      tableDiffUnit: num(row[15]),
      tableDiffPercent: num(row[16]),
      tableDiffTotal: num(row[17]),
    }));
  });

  if (!records.length) throw new Error("Nenhum item de venda foi encontrado. Confirme se o arquivo segue o modelo esperado.");
  return { records, source: file.name, notes: new Set(records.map((record) => record.documentId)).size };
}
