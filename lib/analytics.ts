import type { SaleRecord } from "@/types/sales";
import { withComputedFields } from "@/lib/calculations";

const dateAtNoon = (date: string) => new Date(`${date}T12:00:00`);
const isoDate = (date: Date) => date.toISOString().slice(0, 10);

function mondayOf(date: Date) {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  return result;
}

const sum = (records: SaleRecord[], key: "sale" | "cost" | "profit") =>
  records.reduce((total, record) => total + record[key], 0);

export function filterRecords(records: SaleRecord[], period: string, customStart = "", customEnd = "") {
  if (period === "all" || records.length === 0) return records;
  if (period === "custom") {
    if (customStart && customEnd && customStart > customEnd) return [];
    return records.filter((record) => (!customStart || record.date >= customStart) && (!customEnd || record.date <= customEnd));
  }
  const maximum = records.reduce((max, record) => (record.date > max ? record.date : max), records[0].date);
  const maxDate = dateAtNoon(maximum);
  const start = new Date(maxDate);
  if (period === "90d") start.setDate(start.getDate() - 89);
  if (period === "month") start.setDate(1);
  return records.filter((record) => dateAtNoon(record.date) >= start);
}

export function buildAnalytics(records: SaleRecord[]) {
  const computedRecords = records.map(withComputedFields);
  const sales = sum(computedRecords, "sale");
  const cost = sum(computedRecords, "cost");
  const profit = sum(computedRecords, "profit");
  const notes = new Set(computedRecords.map((record) => record.documentId));
  const clients = new Set(computedRecords.map((record) => record.client));

  const monthlyMap = new Map<string, { key: string; date: Date; sales: number; cost: number; profit: number; notes: Set<string>; clients: Set<string> }>();
  const weeklyMap = new Map<string, { key: string; date: Date; sales: number; cost: number; profit: number }>();
  const clientMap = new Map<string, { name: string; sales: number; profit: number; notes: Set<string>; lastDate: string }>();
  const productMap = new Map<string, { name: string; sales: number; profit: number; cost: number }>();

  for (const record of computedRecords) {
    const date = dateAtNoon(record.date);
    const monthDate = new Date(date.getFullYear(), date.getMonth(), 1, 12);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const month = monthlyMap.get(monthKey) ?? { key: monthKey, date: monthDate, sales: 0, cost: 0, profit: 0, notes: new Set(), clients: new Set() };
    month.sales += record.sale;
    month.cost += record.cost;
    month.profit += record.profit;
    month.notes.add(record.documentId);
    month.clients.add(record.client);
    monthlyMap.set(monthKey, month);

    const weekDate = mondayOf(date);
    const weekKey = isoDate(weekDate);
    const week = weeklyMap.get(weekKey) ?? { key: weekKey, date: weekDate, sales: 0, cost: 0, profit: 0 };
    week.sales += record.sale;
    week.cost += record.cost;
    week.profit += record.profit;
    weeklyMap.set(weekKey, week);

    const client = clientMap.get(record.client) ?? { name: record.client, sales: 0, profit: 0, notes: new Set(), lastDate: record.date };
    client.sales += record.sale;
    client.profit += record.profit;
    client.notes.add(record.documentId);
    if (record.date > client.lastDate) client.lastDate = record.date;
    clientMap.set(record.client, client);

    const productKey = `${record.productCode}|${record.product}`;
    const product = productMap.get(productKey) ?? { name: record.product, sales: 0, profit: 0, cost: 0 };
    product.sales += record.sale;
    product.profit += record.profit;
    product.cost += record.cost;
    productMap.set(productKey, product);
  }

  const monthly = [...monthlyMap.values()].sort((a, b) => a.key.localeCompare(b.key)).map((item) => ({
    key: item.key,
    label: item.date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }).replace(" de ", "/"),
    sales: item.sales,
    cost: item.cost,
    profit: item.profit,
    margin: item.sales ? item.profit / item.sales : 0,
    notes: item.notes.size,
    clients: item.clients.size,
    ticket: item.notes.size ? item.sales / item.notes.size : 0,
  }));

  const weekly = [...weeklyMap.values()].sort((a, b) => a.key.localeCompare(b.key)).map((item) => ({
    key: item.key,
    label: item.date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(" de ", " "),
    sales: item.sales,
    cost: item.cost,
    profit: item.profit,
    margin: item.sales ? item.profit / item.sales : 0,
  }));

  const clientRanking = [...clientMap.values()].map((item) => ({
    ...item,
    purchases: item.notes.size,
    margin: item.sales ? item.profit / item.sales : 0,
    share: sales ? item.sales / sales : 0,
    ticket: item.notes.size ? item.sales / item.notes.size : 0,
  })).sort((a, b) => b.sales - a.sales);

  const productRanking = [...productMap.values()].map((item) => ({
    ...item,
    margin: item.sales ? item.profit / item.sales : 0,
  })).sort((a, b) => b.sales - a.sales);

  const maximumDate = computedRecords.length ? dateAtNoon(computedRecords.reduce((max, record) => (record.date > max ? record.date : max), computedRecords[0].date)) : new Date();
  const lastWeekStart = mondayOf(maximumDate);
  const lastClosedSunday = new Date(lastWeekStart);
  lastClosedSunday.setDate(lastClosedSunday.getDate() + 6);
  const previousStart = new Date(lastWeekStart);
  previousStart.setDate(previousStart.getDate() - 7);
  const previousEnd = new Date(lastWeekStart);
  previousEnd.setDate(previousEnd.getDate() - 1);

  const inRange = (record: SaleRecord, start: Date, end: Date) => {
    const date = dateAtNoon(record.date);
    return date >= start && date <= end;
  };
  const lastWeek = computedRecords.filter((record) => inRange(record, lastWeekStart, lastClosedSunday));
  const previousWeek = computedRecords.filter((record) => inRange(record, previousStart, previousEnd));
  const lastWeekSales = sum(lastWeek, "sale");
  const lastWeekProfit = sum(lastWeek, "profit");
  const previousSales = sum(previousWeek, "sale");
  const previousProfit = sum(previousWeek, "profit");
  const lastMargin = lastWeekSales ? lastWeekProfit / lastWeekSales : 0;
  const previousMargin = previousSales ? previousProfit / previousSales : 0;

  const lowMarginSales = computedRecords.filter((record) => record.sale > 0 && record.profit / record.sale < 0.1).reduce((total, record) => total + record.sale, 0);
  const topClient = clientRanking[0];
  const topProduct = productRanking[0];

  return {
    totals: { sales, cost, profit, margin: sales ? profit / sales : 0, notes: notes.size, clients: clients.size },
    monthly,
    weekly,
    clients: clientRanking,
    products: productRanking,
    topProductsByProfit: [...productRanking].sort((a, b) => b.profit - a.profit),
    belowTable: computedRecords.filter((record) => record.tableDiffTotal < 0).reduce((total, record) => total - record.tableDiffTotal, 0),
    aboveTable: computedRecords.filter((record) => record.tableDiffTotal > 0).reduce((total, record) => total + record.tableDiffTotal, 0),
    belowTableRows: computedRecords.filter((record) => record.tableDiffTotal < 0).sort((a, b) => a.tableDiffTotal - b.tableDiffTotal),
    attention: {
      lowMarginShare: sales ? lowMarginSales / sales : 0,
      lowMarginSales,
      topClient,
      topProduct,
    },
    lastClosedWeek: {
      start: isoDate(lastWeekStart),
      end: isoDate(lastClosedSunday),
      previousStart: isoDate(previousStart),
      previousEnd: isoDate(previousEnd),
      sales: lastWeekSales,
      profit: lastWeekProfit,
      margin: lastMargin,
      salesChange: previousSales ? lastWeekSales / previousSales - 1 : 0,
      profitChange: previousProfit ? lastWeekProfit / previousProfit - 1 : 0,
      marginChange: previousMargin ? lastMargin / previousMargin - 1 : 0,
    },
  };
}
