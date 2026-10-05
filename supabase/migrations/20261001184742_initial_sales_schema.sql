create table public.sales_records (
  id text primary key,
  sale_date date not null,
  document_id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_records_data_is_object check (jsonb_typeof(data) = 'object')
);

create index sales_records_sale_date_idx
  on public.sales_records (sale_date desc, id);

create index sales_records_document_idx
  on public.sales_records (document_id);

alter table public.sales_records enable row level security;

revoke all on table public.sales_records from anon, authenticated;
grant select, insert, update, delete on table public.sales_records to anon, authenticated;

create policy "Shared workspace can read sales records"
  on public.sales_records for select
  to anon, authenticated
  using (true);

create policy "Shared workspace can insert sales records"
  on public.sales_records for insert
  to anon, authenticated
  with check (true);

create policy "Shared workspace can update sales records"
  on public.sales_records for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Shared workspace can delete sales records"
  on public.sales_records for delete
  to anon, authenticated
  using (true);
