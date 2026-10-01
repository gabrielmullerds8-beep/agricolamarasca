create table public.sales_records (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  sale_date date not null,
  document_id text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, id),
  constraint sales_records_data_is_object check (jsonb_typeof(data) = 'object')
);

create index sales_records_owner_date_idx
  on public.sales_records (owner_id, sale_date desc);

create index sales_records_owner_document_idx
  on public.sales_records (owner_id, document_id);

alter table public.sales_records enable row level security;

revoke all on table public.sales_records from anon, authenticated;
grant select, insert, update, delete on table public.sales_records to authenticated;

create policy "Users can read their own sales records"
  on public.sales_records for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Users can insert their own sales records"
  on public.sales_records for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Users can update their own sales records"
  on public.sales_records for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Users can delete their own sales records"
  on public.sales_records for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
