-- Supabase schema for sales automation shared memory

create table if not exists leads (
  id text primary key,
  email text not null,
  name text,
  company text,
  title text,
  interest_status text,
  last_contacted timestamptz,
  channel_blacklist text[] default array[]::text[],
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists lead_embeddings (
  id text primary key,
  lead_id text references leads(id) on delete cascade,
  embedding vector(1536),
  content text,
  created_at timestamptz default now()
);

create index if not exists idx_lead_embeddings_lead_id on lead_embeddings(lead_id);
