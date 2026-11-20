create table if not exists public.social_connections (
  id text primary key,
  platform text not null check (platform in ('instagram','facebook')),
  account_id text not null,
  username text,
  access_token_enc text not null,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected','expired','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, account_id)
);
alter table public.social_connections enable row level security;
drop policy if exists isystem_social_connections_access on public.social_connections;
create policy isystem_social_connections_access on public.social_connections
  for all to isystem_app using (true) with check (true);
grant select, insert, update, delete on public.social_connections to isystem_app;

create table if not exists public.social_oauth_states (
  state_hash text primary key,
  platform text not null check (platform in ('instagram','facebook')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.social_oauth_states enable row level security;
drop policy if exists isystem_social_oauth_states_access on public.social_oauth_states;
create policy isystem_social_oauth_states_access on public.social_oauth_states
  for all to isystem_app using (true) with check (true);
grant select, insert, update, delete on public.social_oauth_states to isystem_app;