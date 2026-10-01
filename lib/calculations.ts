import type { SaleRecord } from "@/types/sales";

const roundCurrency = (value: number) => Math.abs(value) < 0.005 ? 0 : Math.round((value + Number.EPSILON) * 100) / 100;

export const realProfit = (record: Pick<SaleRecord, "sale" | "cost">) => record.sale - record.cost;

export const realMargin = (record: Pick<SaleRecord, "sale" | "cost">) =>
  record.sale ? realProfit(record) / record.sale : 0;

export const tableTotal = (record: Pick<SaleRecord, "tableUnit" | "quantity">) =>
  roundCurrency(record.tableUnit * record.quantity);

export const tableDifference = (record: Pick<SaleRecord, "sale" | "tableUnit" | "quantity">) =>
  roundCurrency(record.sale - tableTotal(record));

export const tableDifferencePercent = (record: Pick<SaleRecord, "sale" | "tableUnit" | "quantity">) => {
  const expected = tableTotal(record);
  return expected ? tableDifference(record) / expected : 0;
};

export function withComputedFields(record: SaleRecord): SaleRecord {
  const profit = realProfit(record);
  const difference = tableDifference(record);
  const quantity = record.quantity;
  return {
    ...record,
    profit,
    profitPercentSource: realMargin(record),
    tableDiffUnit: quantity ? difference / quantity : 0,
    tableDiffPercent: tableDifferencePercent(record),
    tableDiffTotal: difference,
  };
}
