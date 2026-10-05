"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Database, Plus, Search, Trash2, X } from "lucide-react";
import { tableTotal, withComputedFields } from "@/lib/calculations";
import { money, numberFormat, percent, shortDate, truncate } from "@/lib/format";
import type { SaleRecord } from "@/types/sales";

const PAGE_SIZE = 25;
type ManualForm = { date: string; note: string; client: string; productCode: string; product: string; quantity: string; sale: string; cost: string; unit: string; tableUnit: string };
const emptyForm: ManualForm = { date: new Date().toISOString().slice(0, 10), note: "", client: "", productCode: "", product: "", quantity: "1", sale: "", cost: "", unit: "SC", tableUnit: "" };

export function DataWorkspace({ records, onAdd, onDelete }: { records: SaleRecord[]; onAdd: (record: SaleRecord) => void; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ManualForm>(emptyForm);
  const filtered = useMemo(() => { const needle = query.trim().toLocaleLowerCase("pt-BR"); return needle ? records.filter((record) => [record.note, record.client, record.productCode, record.product, record.date].some((value) => String(value).toLocaleLowerCase("pt-BR").includes(needle))) : records; }, [query, records]);
  const sorted = useMemo(() => [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.note.localeCompare(a.note, "pt-BR", { numeric: true, sensitivity: "base" }) || b.itemOrder - a.itemOrder), [filtered]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => {
    const validPage = Math.min(page, pages);
    if (validPage !== page) setPage(validPage);
    setPageInput(String(validPage));
  }, [page, pages]);
  function goToPage(value: number) {
    const nextPage = Math.min(pages, Math.max(1, Number.isFinite(value) ? Math.trunc(value) : page));
    setPage(nextPage);
    setPageInput(String(nextPage));
  }
  function submitPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goToPage(Number(pageInput));
  }
  function update<K extends keyof ManualForm>(key: K, value: ManualForm[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function submit(event: FormEvent) {
    event.preventDefault();
    const sale = Number(form.sale.replace(",", ".")); const cost = Number(form.cost.replace(",", ".")); const quantity = Number(form.quantity.replace(",", ".")); const tableUnit = Number(form.tableUnit.replace(",", ".")) || 0;
    const saleUnit = quantity ? sale / quantity : 0; const tableDiffUnit = tableUnit ? saleUnit - tableUnit : 0;
    onAdd({ id: `manual-${Date.now()}`, note: form.note, order: "", date: form.date, client: form.client.toUpperCase(), cfop: "", customerOrder: "", documentId: `manual-${form.note}-${Date.now()}`, itemOrder: 0, productCode: form.productCode, product: form.product.toUpperCase(), quantity, sale, cost, profitPercentSource: sale ? (sale - cost) / sale : 0, profit: sale - cost, saleShareSource: 0, profitShareSource: 0, type: "", stock: 0, unit: form.unit.toUpperCase(), tableUnit, tableDiffUnit, tableDiffPercent: tableUnit ? tableDiffUnit / tableUnit : 0, tableDiffTotal: tableDiffUnit * quantity });
    setForm(emptyForm); setShowForm(false); goToPage(1);
  }
  return <div className="data-stack">
    <section className="data-summary"><article><Database size={21}/><div><strong>{records.length.toLocaleString("pt-BR")}</strong><span>itens cadastrados</span></div></article><article><strong>{new Set(records.map((record) => record.documentId)).size.toLocaleString("pt-BR")}</strong><span>documentos únicos</span></article><article><strong>{new Set(records.map((record) => record.client)).size.toLocaleString("pt-BR")}</strong><span>clientes</span></article></section>
    <section className="panel data-panel"><div className="data-toolbar"><label className="search-box"><Search size={18}/><input value={query} onChange={(event) => { setQuery(event.target.value); goToPage(1); }} placeholder="Buscar nota, cliente ou produto" /></label><button className="secondary-button" onClick={() => setShowForm(true)}><Plus size={18}/> Novo registro</button></div>
      <div className="table-scroll data-table"><table><thead><tr><th>Data</th><th>Nota</th><th>Cliente</th><th>Produto</th><th>Qtd.</th><th>Venda</th><th>Valor de tabela</th><th>Dif. tabela</th><th>Dif. %</th><th>Custo</th><th>Resultado</th><th>Margem</th><th aria-label="Ações"></th></tr></thead><tbody>{visible.map((source) => { const record = withComputedFields(source); const expected = tableTotal(record); return <tr key={record.id}><td>{shortDate(record.date)}</td><td>{record.note}</td><td title={record.client}>{truncate(record.client, 31)}</td><td title={record.product}>{truncate(record.product, 40)}</td><td>{numberFormat.format(record.quantity)} {record.unit}</td><td>{money.format(record.sale)}</td><td>{money.format(expected)}</td><td className={record.tableDiffTotal < 0 ? "negative" : record.tableDiffTotal > 0 ? "positive" : ""}>{money.format(record.tableDiffTotal)}</td><td className={record.tableDiffPercent < 0 ? "negative" : record.tableDiffPercent > 0 ? "positive" : ""}>{percent.format(record.tableDiffPercent)}</td><td>{money.format(record.cost)}</td><td>{money.format(record.profit)}</td><td>{percent.format(record.profitPercentSource)}</td><td><button className="row-action" onClick={() => onDelete(record.id)} aria-label={`Excluir item da nota ${record.note}`}><Trash2 size={16}/></button></td></tr>; })}</tbody></table></div>
      <footer className="pagination"><span>{sorted.length ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, sorted.length)}` : "0"} de {sorted.length.toLocaleString("pt-BR")}</span><div><form className="page-jump" onSubmit={submitPage}><label><span>Página</span><input type="text" inputMode="numeric" pattern="[0-9]*" aria-label="Número da página" value={pageInput} onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ""))}/><span>de {pages}</span></label></form><button disabled={page === 1} onClick={() => goToPage(page - 1)} aria-label="Página anterior"><ChevronLeft size={18}/></button><button disabled={page === pages} onClick={() => goToPage(page + 1)} aria-label="Próxima página"><ChevronRight size={18}/></button></div></footer></section>
    {showForm && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="manual-title"><header><div><p className="eyebrow">INCLUSÃO MANUAL</p><h2 id="manual-title">Novo registro de venda</h2></div><button className="icon-button" onClick={() => setShowForm(false)} aria-label="Fechar"><X size={19}/></button></header><form onSubmit={submit}><div className="form-grid"><label><span>Data</span><input type="date" value={form.date} onChange={(event) => update("date", event.target.value)} required /></label><label><span>Nota</span><input value={form.note} onChange={(event) => update("note", event.target.value)} required /></label><label className="wide"><span>Cliente</span><input value={form.client} onChange={(event) => update("client", event.target.value)} required /></label><label><span>Código do produto</span><input value={form.productCode} onChange={(event) => update("productCode", event.target.value)} required /></label><label className="wide"><span>Produto</span><input value={form.product} onChange={(event) => update("product", event.target.value)} required /></label><label><span>Quantidade</span><input inputMode="decimal" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} required /></label><label><span>Unidade</span><input value={form.unit} onChange={(event) => update("unit", event.target.value)} required /></label><label><span>Venda (R$)</span><input inputMode="decimal" value={form.sale} onChange={(event) => update("sale", event.target.value)} required /></label><label><span>Custo (R$)</span><input inputMode="decimal" value={form.cost} onChange={(event) => update("cost", event.target.value)} required /></label><label><span>Tabela unitária (R$)</span><input inputMode="decimal" value={form.tableUnit} onChange={(event) => update("tableUnit", event.target.value)} /></label></div><footer><button type="button" className="ghost-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button">Salvar registro</button></footer></form></section></div>}
  </div>;
}
