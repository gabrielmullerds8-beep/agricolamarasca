revoke all on table public.sales_records from anon;
grant select, insert, update, delete on table public.sales_records to authenticated;

drop policy if exists "Shared workspace can read sales records" on public.sales_records;
drop policy if exists "Shared workspace can insert sales records" on public.sales_records;
drop policy if exists "Shared workspace can update sales records" on public.sales_records;
drop policy if exists "Shared workspace can delete sales records" on public.sales_records;

create policy "Authenticated users can read shared sales records"
  on public.sales_records for select
  to authenticated
  using (true);

create policy "Authenticated users can insert shared sales records"
  on public.sales_records for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update shared sales records"
  on public.sales_records for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete shared sales records"
  on public.sales_records for delete
  to authenticated
  using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sales_records'
  ) then
    alter publication supabase_realtime add table public.sales_records;
  end if;
end
$$;
