-- ============================================================
-- Supabase / PostgreSQL schema for Sales Automation CRM
-- Dialect: PostgreSQL 15+  (not T-SQL / MSSQL)
-- Run once in Supabase SQL editor or via Supabase CLI migrations
-- ============================================================

-- Enable pgvector for semantic lead embeddings
create extension if not exists vector;

-- ============================================================
-- leads
-- ============================================================
create table if not exists leads (
  id                        text primary key,
  email                     text not null,
  name                      text,
  company                   text,
  title                     text,
  interest_status           text default 'new',
  last_contacted            timestamptz,
  channel_blacklist         text[]  default array[]::text[],
  automation_paused         boolean default false,
  human_review_required     boolean default false,
  review_reason             text,
  review_assigned_to        text,
  next_action               text,
  human_review_action       text,
  human_review_resolved_by  text,
  human_review_notes        text,
  metadata                  jsonb   default '{}'::jsonb,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

-- Indexes for common dashboard queries
create index if not exists idx_leads_interest_status   on leads (interest_status);
create index if not exists idx_leads_human_review       on leads (human_review_required) where human_review_required = true;
create index if not exists idx_leads_updated_at         on leads (updated_at desc);
create index if not exists idx_leads_email              on leads (email);

-- ============================================================
-- lead_notifications
-- ============================================================
create table if not exists lead_notifications (
  id         text primary key,
  lead_id    text references leads (id) on delete cascade,
  category   text,
  message    text,
  status     text default 'pending',
  metadata   jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_lead_notifications_lead_id   on lead_notifications (lead_id);
create index if not exists idx_lead_notifications_status    on lead_notifications (status);
create index if not exists idx_lead_notifications_created   on lead_notifications (created_at desc);

-- ============================================================
-- lead_embeddings  (pgvector semantic search)
-- ============================================================
create table if not exists lead_embeddings (
  id         text primary key,
  lead_id    text references leads (id) on delete cascade,
  embedding  vector(1536),
  content    text,
  created_at timestamptz default now()
);

create index if not exists idx_lead_embeddings_lead_id on lead_embeddings (lead_id);

-- Optional: HNSW index for fast ANN vector search (requires pgvector >= 0.5)
-- create index if not exists idx_lead_embeddings_hnsw
--   on lead_embeddings using hnsw (embedding vector_cosine_ops);

-- ============================================================
-- Auto-update updated_at on leads
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_leads_updated_at on leads;
create trigger trg_leads_updated_at
  before update on leads
  for each row execute procedure set_updated_at();
