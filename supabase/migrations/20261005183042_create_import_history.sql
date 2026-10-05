create table public.import_history (
  id bigint generated always as identity primary key,
  imported_at timestamptz not null default now()
);

create index import_history_imported_at_idx
  on public.import_history (imported_at desc);

alter table public.import_history enable row level security;

revoke all on table public.import_history from anon;
grant select, insert on table public.import_history to authenticated;

create policy "Authenticated users can read import history"
  on public.import_history for select
  to authenticated
  using (true);

create policy "Authenticated users can record imports"
  on public.import_history for insert
  to authenticated
  with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'import_history'
  ) then
    alter publication supabase_realtime add table public.import_history;
  end if;
end
$$;
