create table public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'blueprint_download',
  user_agent text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index leads_email_source_unique on public.leads (lower(email), source);

grant insert on public.leads to anon;
grant insert on public.leads to authenticated;
grant all on public.leads to service_role;

alter table public.leads enable row level security;

create policy "anyone can submit a lead"
  on public.leads for insert
  to anon, authenticated
  with check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');