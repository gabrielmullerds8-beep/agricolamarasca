"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { BarChart3, Database, FileSpreadsheet, Leaf, LoaderCircle, LogOut, Upload, X } from "lucide-react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { LoginScreen } from "@/components/LoginScreen";
import { filterRecords } from "@/lib/analytics";
import { parseSalesWorkbook, recordFingerprint } from "@/lib/importers";
import { createBrowserSupabase, hasSupabaseConfig, isSupabaseAuthEnabled } from "@/lib/supabase/browser";
import type { SaleRecord, SeedPayload } from "@/types/sales";

const LOCAL_KEY = "agricola-marasca-records-v1";
type Notice = { tone: "success" | "error"; text: string };
const Dashboard = dynamic(() => import("@/components/Dashboard").then((module) => module.Dashboard), { ssr: false });
const DataWorkspace = dynamic(() => import("@/components/DataWorkspace").then((module) => module.DataWorkspace), { ssr: false });

function maskDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
}

function brDateToIso(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return "";
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return "";
  return `${year}-${month}-${day}`;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "data">("dashboard");
  const [period, setPeriod] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [records, setRecords] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [importPreview, setImportPreview] = useState<{ records: SaleRecord[]; source: string; notes: number; newCount: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = useMemo<SupabaseClient | null>(() => createBrowserSupabase(), []);
  const signedInUserId = session?.user.id;

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data.session);
        if (!isSupabaseAuthEnabled || data.session) {
          await loadSupabaseRecords(supabase, setRecords, setNotice);
        }
      } else {
        const stored = localStorage.getItem(LOCAL_KEY);
        if (stored) setRecords(JSON.parse(stored));
        else {
          const response = await fetch("/seed-sales.json");
          const payload: SeedPayload = await response.json();
          setRecords(payload.records);
        }
      }
      if (mounted) setLoading(false);
    }
    bootstrap();
    const subscription = isSupabaseAuthEnabled ? supabase?.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession && supabase) void loadSupabaseRecords(supabase, setRecords, setNotice);
      if (!nextSession) setRecords([]);
      setLoading(false);
    }).data.subscription : undefined;
    return () => { mounted = false; subscription?.unsubscribe(); };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || (isSupabaseAuthEnabled && !signedInUserId)) return;

    const channel = supabase
      .channel("sales-records-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales_records" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id?: string }).id;
            if (deletedId) setRecords((current) => current.filter((record) => record.id !== deletedId));
            return;
          }

          const changedRecord = (payload.new as { data?: SaleRecord }).data;
          if (!changedRecord) return;
          setRecords((current) => {
            const recordIndex = current.findIndex((record) => record.id === changedRecord.id);
            if (recordIndex === -1) return [...current, changedRecord].sort((a, b) => a.date.localeCompare(b.date));
            const updated = [...current];
            updated[recordIndex] = changedRecord;
            return updated.sort((a, b) => a.date.localeCompare(b.date));
          });
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [signedInUserId, supabase]);

  useEffect(() => { if (!supabase && records.length) localStorage.setItem(LOCAL_KEY, JSON.stringify(records)); }, [records, supabase]);
  const customStartIso = brDateToIso(customStart);
  const customEndIso = brDateToIso(customEnd);
  const customRangeInvalid = period === "custom" && (
    (customStart.length === 10 && !customStartIso) ||
    (customEnd.length === 10 && !customEndIso) ||
    Boolean(customStartIso && customEndIso && customStartIso > customEndIso)
  );
  const visibleRecords = useMemo(
    () => customRangeInvalid ? [] : filterRecords(records, period, customStartIso, customEndIso),
    [customEndIso, customRangeInvalid, customStartIso, period, records],
  );

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    setImporting(true); setNotice(null);
    try { const parsed = await parseSalesWorkbook(file); const fingerprints = new Set(records.map(recordFingerprint)); setImportPreview({ ...parsed, newCount: parsed.records.filter((record) => !fingerprints.has(recordFingerprint(record))).length }); }
    catch (error) { setNotice({ tone: "error", text: error instanceof Error ? error.message : "Não foi possível ler a planilha." }); }
    finally { setImporting(false); }
  }

  async function confirmImport() {
    if (!importPreview) return; setImporting(true);
    const existing = new Set(records.map(recordFingerprint)); const newRecords = importPreview.records.filter((record) => !existing.has(recordFingerprint(record)));
    try {
      if (supabase && newRecords.length) await persistSupabaseRecords(supabase, newRecords);
      setRecords((current) => [...current, ...newRecords].sort((a, b) => a.date.localeCompare(b.date)));
      setNotice({ tone: "success", text: `${newRecords.length.toLocaleString("pt-BR")} itens novos importados. ${importPreview.records.length - newRecords.length} duplicados foram ignorados.` }); setImportPreview(null);
    } catch { setNotice({ tone: "error", text: "A planilha foi lida, mas não foi possível salvar os dados." }); }
    finally { setImporting(false); }
  }

  async function addRecord(record: SaleRecord) {
    if (supabase) { const { error } = await supabase.from("sales_records").insert(toDatabaseRow(record)); if (error) { setNotice({ tone: "error", text: "Não foi possível salvar o registro." }); return; } }
    setRecords((current) => [...current, record]); setNotice({ tone: "success", text: "Registro incluído e indicadores atualizados." });
  }

  async function deleteRecord(id: string) {
    if (!window.confirm("Excluir este item da base? Essa ação altera todos os indicadores.")) return;
    if (supabase) { const { error } = await supabase.from("sales_records").delete().eq("id", id); if (error) { setNotice({ tone: "error", text: "Não foi possível excluir o registro." }); return; } }
    setRecords((current) => current.filter((record) => record.id !== id)); setNotice({ tone: "success", text: "Registro excluído." });
  }

  if (loading) return <main className="loading-screen"><span className="login-mark"><Leaf size={30}/></span><LoaderCircle className="spin" size={26}/><p>Preparando seus indicadores…</p></main>;
  if (hasSupabaseConfig && isSupabaseAuthEnabled && supabase && !session) return <LoginScreen supabase={supabase}/>;

  return <main className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark"><Leaf size={21}/></span><span><strong>Agrícola Marasca</strong><small>Inteligência comercial</small></span></div><nav className="tabs" aria-label="Navegação principal"><button className={activeTab === "dashboard" ? "active" : ""} onClick={() => setActiveTab("dashboard")}><BarChart3 size={17}/> Visão geral</button><button className={activeTab === "data" ? "active" : ""} onClick={() => setActiveTab("data")}><Database size={17}/> Base de dados</button></nav><div className="top-actions">{!supabase && <span className="demo-badge">Demonstração local</span>}{supabase && !isSupabaseAuthEnabled && <span className="demo-badge">Supabase conectado</span>}{supabase && isSupabaseAuthEnabled && session && <button className="icon-button" onClick={() => supabase.auth.signOut()} aria-label="Sair"><LogOut size={18}/></button>}</div></header>
    <section className="workspace"><div className="page-heading"><div><p className="eyebrow">{activeTab === "dashboard" ? "PAINEL COMERCIAL" : "GESTÃO DOS DADOS"}</p><h1>{activeTab === "dashboard" ? "Vendas e rentabilidade" : "Base de dados"}</h1><p>{activeTab === "dashboard" ? "Indicadores calculados automaticamente a partir da base consolidada." : "Importe a planilha semanal ou mantenha os registros manualmente."}</p></div><div className="heading-actions">{activeTab === "dashboard" && <div className="date-filter"><select aria-label="Período" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="all">Todo o período</option><option value="90d">Últimos 90 dias</option><option value="month">Mês mais recente</option><option value="custom">Personalizado</option></select>{period === "custom" && <div className="date-range-fields"><label><span>De</span><input type="text" inputMode="numeric" maxLength={10} placeholder="dd/mm/aaaa" aria-label="Data inicial" value={customStart} aria-invalid={customRangeInvalid} onChange={(event) => setCustomStart(maskDate(event.target.value))}/></label><span className="date-separator">a</span><label><span>Até</span><input type="text" inputMode="numeric" maxLength={10} placeholder="dd/mm/aaaa" aria-label="Data final" value={customEnd} aria-invalid={customRangeInvalid} onChange={(event) => setCustomEnd(maskDate(event.target.value))}/></label>{customRangeInvalid && <small role="alert">Informe datas válidas, com a inicial anterior à final.</small>}</div>}</div>}<input ref={inputRef} type="file" accept=".xls,.xlsx" hidden onChange={handleFile}/><button className="primary-button" onClick={() => inputRef.current?.click()} disabled={importing}>{importing ? <LoaderCircle className="spin" size={18}/> : <Upload size={18}/>} Importar planilha</button></div></div>
      {notice && <div className={`notice ${notice.tone}`} role="status"><span>{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Fechar aviso"><X size={16}/></button></div>}
      {activeTab === "dashboard" ? <Dashboard records={visibleRecords}/> : <DataWorkspace records={records} onAdd={addRecord} onDelete={deleteRecord}/>} 
    </section>
    {importPreview && <div className="modal-backdrop"><section className="modal import-modal" role="dialog" aria-modal="true" aria-labelledby="import-title"><header><div><p className="eyebrow">IMPORTAÇÃO VALIDADA</p><h2 id="import-title">{importPreview.source}</h2></div><button className="icon-button" onClick={() => setImportPreview(null)} aria-label="Fechar"><X size={19}/></button></header><div className="import-result"><span className="file-icon"><FileSpreadsheet size={32}/></span><div><strong>{importPreview.records.length.toLocaleString("pt-BR")} itens encontrados</strong><p>{importPreview.notes.toLocaleString("pt-BR")} documentos · {importPreview.newCount.toLocaleString("pt-BR")} itens novos</p></div></div><p className="import-note">O sistema acrescentará apenas os registros novos. Itens já existentes na base serão ignorados para evitar duplicidade.</p><footer><button className="ghost-button" onClick={() => setImportPreview(null)}>Cancelar</button><button className="primary-button" onClick={confirmImport} disabled={importing}>{importing && <LoaderCircle className="spin" size={18}/>} Confirmar importação</button></footer></section></div>}
  </main>;
}

function toDatabaseRow(record: SaleRecord) {
  return { id: record.id, data: record, sale_date: record.date, document_id: record.documentId };
}

async function persistSupabaseRecords(supabase: SupabaseClient, records: SaleRecord[]) {
  const rows = records.map(toDatabaseRow);
  for (let index = 0; index < rows.length; index += 400) {
    const { error } = await supabase.from("sales_records").upsert(rows.slice(index, index + 400), { onConflict: "id" });
    if (error) throw error;
  }
}

async function loadSupabaseRecords(supabase: SupabaseClient, setRecords: (records: SaleRecord[]) => void, setNotice: (notice: Notice | null) => void) {
  const pageSize = 1000;
  const rows: { data: SaleRecord }[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("sales_records")
      .select("data")
      .order("sale_date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) { setNotice({ tone: "error", text: "Não foi possível carregar a base do Supabase." }); return; }
    rows.push(...((data ?? []) as { data: SaleRecord }[]));
    if (!data || data.length < pageSize) break;
  }

  if (rows.length) {
    setRecords(rows.map((row) => row.data));
    return;
  }

  try {
    const response = await fetch("/seed-sales.json");
    const payload: SeedPayload = await response.json();
    await persistSupabaseRecords(supabase, payload.records);
    setRecords(payload.records);
  } catch {
    setNotice({ tone: "error", text: "O banco está vazio e a carga inicial não pôde ser concluída." });
  }
}
