"use client";

import { useMemo } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, CalendarRange, CircleDollarSign, FileText, TrendingDown, TrendingUp, Users } from "lucide-react";
import { buildAnalytics } from "@/lib/analytics";
import { compactMoney, money, percent, shortDate, truncate } from "@/lib/format";
import type { SaleRecord } from "@/types/sales";
import { ChartCard } from "./ChartCard";

const chartTooltipStyle = { background: "#111914", border: "1px solid #334137", borderRadius: 12, color: "#f5f7f2" };
const axisStyle = { fill: "#91a097", fontSize: 12 };

function Change({ value, percentage = true }: { value: number; percentage?: boolean }) {
  const positive = value >= 0;
  return <small className={positive ? "positive" : "negative"}>{positive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}{percentage ? percent.format(value) : `${(value * 100).toFixed(2).replace(".", ",")} p.p.`}</small>;
}

export function Dashboard({ records }: { records: SaleRecord[] }) {
  const data = useMemo(() => buildAnalytics(records), [records]);
  const { totals, lastClosedWeek } = data;
  const dateRange = records.length ? `${shortDate(records.reduce((min, record) => record.date < min ? record.date : min, records[0].date))} a ${shortDate(records.reduce((max, record) => record.date > max ? record.date : max, records[0].date))}` : "Sem dados";

  return (
    <div className="dashboard-stack">
      <section className="kpi-grid">
        <article><span><CircleDollarSign size={17} /> Vendas</span><strong>{compactMoney.format(totals.sales)}</strong><small>{money.format(totals.sales)} no período</small></article>
        <article><span><TrendingUp size={17} /> Resultado</span><strong>{compactMoney.format(totals.profit)}</strong><small>Venda efetiva menos custo</small></article>
        <article><span><AlertTriangle size={17} /> Margem sobre vendas</span><strong>{percent.format(totals.margin)}</strong><small>Rentabilidade consolidada</small></article>
        <article><span><FileText size={17} /> Documentos</span><strong>{totals.notes.toLocaleString("pt-BR")}</strong><small>{totals.clients.toLocaleString("pt-BR")} clientes · {dateRange}</small></article>
      </section>

      <section className="section-block">
        <div className="section-title"><div><p className="eyebrow">ACOMPANHAMENTO SEMANAL</p><h2>Última semana fechada</h2></div><span><CalendarRange size={16} /> {shortDate(lastClosedWeek.start)} a {shortDate(lastClosedWeek.end)} vs. {shortDate(lastClosedWeek.previousStart)} a {shortDate(lastClosedWeek.previousEnd)}</span></div>
        <div className="weekly-kpis">
          <article><span>Vendas</span><strong>{money.format(lastClosedWeek.sales)}</strong><Change value={lastClosedWeek.salesChange} /></article>
          <article><span>Resultado</span><strong>{money.format(lastClosedWeek.profit)}</strong><Change value={lastClosedWeek.profitChange} /></article>
          <article><span>Margem</span><strong>{percent.format(lastClosedWeek.margin)}</strong><Change value={lastClosedWeek.marginChange} percentage={false} /></article>
        </div>
      </section>

      <section className="chart-grid two">
        <ChartCard title="Vendas e custo por mês (R$)" eyebrow="VENDAS E RENTABILIDADE">
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.monthly}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a8d65e" stopOpacity={0.35}/><stop offset="95%" stopColor="#a8d65e" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#263129" vertical={false}/><XAxis dataKey="label" tick={axisStyle}/><YAxis tick={axisStyle} tickFormatter={(value) => compactMoney.format(value)}/><Tooltip contentStyle={chartTooltipStyle} formatter={(value) => money.format(Number(value))}/><Legend/><Area type="monotone" dataKey="sales" name="Vendas" stroke="#a8d65e" fill="url(#salesFill)" strokeWidth={3}/><Line type="monotone" dataKey="cost" name="Custo" stroke="#ff7979" strokeWidth={2.5} dot={false}/></AreaChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Margem sobre vendas por mês" eyebrow="EVOLUÇÃO DA MARGEM">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={data.monthly}><CartesianGrid stroke="#263129" vertical={false}/><XAxis dataKey="label" tick={axisStyle}/><YAxis tick={axisStyle} tickFormatter={(value) => `${Math.round(value * 100)}%`}/><Tooltip contentStyle={chartTooltipStyle} formatter={(value) => percent.format(Number(value))}/><Line type="monotone" dataKey="margin" name="Margem" stroke="#f4bb32" strokeWidth={3} dot={{ fill: "#f4bb32", r: 3 }}/></LineChart></ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="panel attention-panel">
        <div className="panel-heading"><p className="eyebrow">PONTOS DE ATENÇÃO</p><h3>Concentração e exposição comercial</h3></div>
        <div className="attention-grid">
          <div><span>Vendas em itens com margem abaixo de 10%</span><strong>{percent.format(data.attention.lowMarginShare)}</strong><small>{money.format(data.attention.lowMarginSales)}</small></div>
        </div>
      </section>

      <section className="chart-grid two">
        <ChartCard title="Vendas por semana (R$)" eyebrow="EVOLUÇÃO E MARGEM">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={data.weekly}><CartesianGrid stroke="#263129" vertical={false}/><XAxis dataKey="label" tick={axisStyle} interval={3}/><YAxis tick={axisStyle} tickFormatter={(value) => compactMoney.format(value)}/><Tooltip contentStyle={chartTooltipStyle} formatter={(value) => money.format(Number(value))}/><Line type="monotone" dataKey="sales" name="Vendas" stroke="#9acb4c" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Margem por semana" eyebrow="EVOLUÇÃO E MARGEM">
          <ResponsiveContainer width="100%" height="100%"><LineChart data={data.weekly}><CartesianGrid stroke="#263129" vertical={false}/><XAxis dataKey="label" tick={axisStyle} interval={3}/><YAxis tick={axisStyle} tickFormatter={(value) => `${Math.round(value * 100)}%`}/><Tooltip contentStyle={chartTooltipStyle} formatter={(value) => percent.format(Number(value))}/><Line type="monotone" dataKey="margin" name="Margem" stroke="#f4bb32" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="chart-grid two">
        <ChartCard title="10 maiores produtos em vendas (R$)" eyebrow="PRODUTOS QUE GERAM VENDA E RESULTADO">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data.products.slice(0, 10).map((item) => ({ ...item, label: truncate(item.name, 22) }))} layout="vertical" margin={{ left: 18 }}><CartesianGrid stroke="#263129" horizontal={false}/><XAxis type="number" tick={axisStyle} tickFormatter={(value) => compactMoney.format(value)}/><YAxis type="category" dataKey="label" width={135} tick={axisStyle}/><Tooltip contentStyle={chartTooltipStyle} formatter={(value) => money.format(Number(value))}/><Bar dataKey="sales" name="Vendas" fill="#95c947" radius={[0, 8, 8, 0]}/></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="10 maiores produtos em resultado (R$)" eyebrow="PRODUTOS QUE GERAM VENDA E RESULTADO">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data.topProductsByProfit.slice(0, 10).map((item) => ({ ...item, label: truncate(item.name, 22) }))} layout="vertical" margin={{ left: 18 }}><CartesianGrid stroke="#263129" horizontal={false}/><XAxis type="number" tick={axisStyle} tickFormatter={(value) => compactMoney.format(value)}/><YAxis type="category" dataKey="label" width={135} tick={axisStyle}/><Tooltip contentStyle={chartTooltipStyle} formatter={(value) => money.format(Number(value))}/><Bar dataKey="profit" name="Resultado" fill="#ad8af4" radius={[0, 8, 8, 0]}/></BarChart></ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="chart-grid concentration-grid">
        <ChartCard title="10 maiores clientes em vendas (R$)" eyebrow="CONCENTRAÇÃO DA CARTEIRA">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data.clients.slice(0, 10).map((item) => ({ ...item, label: truncate(item.name, 24) }))} layout="vertical" margin={{ left: 18 }}><CartesianGrid stroke="#263129" horizontal={false}/><XAxis type="number" tick={axisStyle} tickFormatter={(value) => compactMoney.format(value)}/><YAxis type="category" dataKey="label" width={145} tick={axisStyle}/><Tooltip contentStyle={chartTooltipStyle} formatter={(value) => money.format(Number(value))}/><Bar dataKey="sales" name="Vendas" fill="#95c947" radius={[0, 8, 8, 0]}/></BarChart></ResponsiveContainer>
        </ChartCard>
        <article className="panel table-panel"><div className="panel-heading"><p className="eyebrow">RESUMO MENSAL</p><h3>Desempenho por mês</h3></div><div className="table-scroll"><table><thead><tr><th>Mês</th><th>Vendas</th><th>Custo</th><th>Resultado</th><th>Margem</th><th>Documentos</th><th>Ticket médio</th></tr></thead><tbody>{data.monthly.map((item) => <tr key={item.key}><td>{item.label}</td><td>{money.format(item.sales)}</td><td>{money.format(item.cost)}</td><td>{money.format(item.profit)}</td><td>{percent.format(item.margin)}</td><td>{item.notes}</td><td>{money.format(item.ticket)}</td></tr>)}</tbody></table></div></article>
      </section>

      <section className="section-block">
        <div className="section-title"><div><p className="eyebrow">PREÇOS PRATICADOS E TABELA</p><h2>Desvios de preço</h2></div></div>
        <div className="price-kpis"><article><span>Diferença abaixo da tabela</span><strong>{money.format(data.belowTable)}</strong></article><article><span>Diferença acima da tabela</span><strong>{money.format(data.aboveTable)}</strong></article></div>
        <article className="panel table-panel"><div className="panel-heading"><h3>Maiores diferenças abaixo da tabela</h3></div><div className="table-scroll"><table><thead><tr><th>Data</th><th>Nota</th><th>Cliente</th><th>Produto</th><th>Venda</th><th>Valor de tabela</th><th>Deixou de ganhar</th><th>Dif. %</th><th>Margem</th></tr></thead><tbody>{data.belowTableRows.slice(0, 10).map((record) => <tr key={record.id}><td>{shortDate(record.date)}</td><td>{record.note}</td><td>{record.client}</td><td>{truncate(record.product, 38)}</td><td>{money.format(record.sale)}</td><td>{money.format(record.tableUnit * record.quantity)}</td><td>{money.format(-record.tableDiffTotal)}</td><td>{percent.format(record.tableDiffPercent)}</td><td>{percent.format(record.sale ? record.profit / record.sale : 0)}</td></tr>)}</tbody></table></div></article>
      </section>

      <section className="panel table-panel clients-panel"><div className="panel-heading"><p className="eyebrow">CLIENTES</p><h3>Carteira comercial</h3></div><div className="table-scroll"><table><thead><tr><th>Cliente</th><th>Vendas</th><th>Resultado</th><th>Margem</th><th>Part. vendas</th><th>Compras</th><th>Ticket médio</th><th>Última compra</th></tr></thead><tbody>{data.clients.slice(0, 20).map((client) => <tr key={client.name}><td>{client.name}</td><td>{money.format(client.sales)}</td><td>{money.format(client.profit)}</td><td>{percent.format(client.margin)}</td><td>{percent.format(client.share)}</td><td>{client.purchases}</td><td>{money.format(client.ticket)}</td><td>{shortDate(client.lastDate)}</td></tr>)}</tbody></table></div></section>
    </div>
  );
}
