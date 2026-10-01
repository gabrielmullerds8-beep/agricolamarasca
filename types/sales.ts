export type SaleRecord = {
  id: string;
  sourceRow?: number;
  note: string;
  order: string;
  date: string;
  client: string;
  cfop: string;
  customerOrder: string;
  documentId: string;
  itemOrder: number;
  productCode: string;
  product: string;
  quantity: number;
  sale: number;
  cost: number;
  profitPercentSource: number;
  profit: number;
  saleShareSource: number;
  profitShareSource: number;
  type: string;
  stock: number;
  unit: string;
  tableUnit: number;
  tableDiffUnit: number;
  tableDiffPercent: number;
  tableDiffTotal: number;
};

export type SeedPayload = {
  source: string;
  importedAt: string | null;
  records: SaleRecord[];
};

export type ImportResult = {
  records: SaleRecord[];
  source: string;
  notes: number;
};
