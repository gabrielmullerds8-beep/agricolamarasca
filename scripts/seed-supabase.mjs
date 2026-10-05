import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
}

const payload = JSON.parse(await readFile(new URL("../public/seed-sales.json", import.meta.url), "utf8"));
const supabase = createClient(url, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const rows = payload.records.map((record) => ({
  id: record.id,
  sale_date: record.date,
  document_id: record.documentId,
  data: record,
}));

for (let index = 0; index < rows.length; index += 400) {
  const { error } = await supabase
    .from("sales_records")
    .upsert(rows.slice(index, index + 400), { onConflict: "id" });
  if (error) throw error;
}

const { count, error } = await supabase
  .from("sales_records")
  .select("id", { count: "exact", head: true });
if (error) throw error;

console.log(`${rows.length} registros enviados; ${count ?? 0} registros confirmados no banco.`);
