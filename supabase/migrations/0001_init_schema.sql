-- =============================================================================
-- 0001_init_schema.sql
-- Claim What's Yours: public scheme/document catalogue.
--
-- Design:
--   * schemes            one row per government scheme (mirrors data/schemes/*.json)
--   * scheme_rules       eligibility rules for a scheme (mirrors scheme.rules[])
--   * documents          documents a citizen may need (mirrors data/documents.json)
--   * scheme_documents   which documents a scheme asks for (mirrors scheme.documents[])
--   * document_requirements  document-to-document prerequisites (mirrors doc.requires[])
--
--   * Multilingual text ({ "en": ..., "te": ... }) is stored as jsonb.
--   * Sentinel values: last_verified = 'UNVERIFIED' (schemes) and '' (documents)
--     are PLACEHOLDERS meaning "not yet checked against an official source".
--     Replace them with a real verification date/label once a value is confirmed.
--     Likewise source_clause = 'UNVERIFIED - ...' marks rule text still to be sourced.
--   * No persona/profile tables: user profiles are not stored in this schema.
--
-- Access:
--   * Row level security is enabled on every table.
--   * anon and authenticated roles may SELECT all rows (the data is public).
--   * No insert/update/delete policies exist for anon/authenticated; writes go
--     through the service role, which bypasses RLS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- schemes
-- -----------------------------------------------------------------------------
create table if not exists public.schemes (
  id             text primary key,
  name           jsonb not null,                       -- { "en": ..., "te": ... }
  level          text not null check (level in ('central', 'state')),
  department     text not null default '',
  benefit        jsonb not null default '{}'::jsonb,   -- { "en": ..., "te": ... }
  fee_inr        integer not null default 0,
  apply_steps    jsonb not null default '[]'::jsonb,   -- [ { "en": ..., "te": ... }, ... ]
  apply_url      text not null default '',
  source_url     text not null default '',
  last_verified  text not null default 'UNVERIFIED',   -- placeholder sentinel, see header
  deadline       date null,
  followup_days  integer not null default 30,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- scheme_rules
-- -----------------------------------------------------------------------------
create table if not exists public.scheme_rules (
  id             bigint generated always as identity primary key,
  scheme_id      text not null references public.schemes(id) on delete cascade,
  rule_key       text not null default '',             -- original rule id from JSON, e.g. 'pm-sym-age'
  field          text not null,                        -- a Profile key, e.g. 'age'
  op             text not null check (op in ('eq', 'gte', 'lte', 'between', 'in', 'not_in')),
  value          jsonb not null,                       -- number, boolean, string, or array
  explain        jsonb not null default '{}'::jsonb,   -- { "en": ..., "te": ... }
  source_clause  text not null default ''              -- placeholder sentinel, see header
);

create index if not exists scheme_rules_scheme_id_idx
  on public.scheme_rules (scheme_id);

-- -----------------------------------------------------------------------------
-- documents
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id              text primary key,
  name            jsonb not null,                      -- { "en": ..., "te": ... }
  issued_by       text not null default '',
  obtained_at     text not null default '',            -- JSON key "where" (renamed: reserved word)
  fee_inr         integer not null default 0,
  typical_days    integer not null default 0,
  validity_months integer null,
  source_url      text not null default '',
  last_verified   text not null default ''             -- placeholder sentinel, see header
);

-- -----------------------------------------------------------------------------
-- scheme_documents  (scheme -> documents it asks for)
-- -----------------------------------------------------------------------------
create table if not exists public.scheme_documents (
  scheme_id    text not null references public.schemes(id) on delete cascade,
  document_id  text not null references public.documents(id) on delete cascade,
  primary key (scheme_id, document_id)
);

create index if not exists scheme_documents_document_id_idx
  on public.scheme_documents (document_id);

-- -----------------------------------------------------------------------------
-- document_requirements  (document -> prerequisite document)
-- -----------------------------------------------------------------------------
create table if not exists public.document_requirements (
  document_id   text not null references public.documents(id) on delete cascade,
  requires_id   text not null references public.documents(id) on delete cascade,
  primary key (document_id, requires_id),
  check (document_id <> requires_id)
);

create index if not exists document_requirements_requires_id_idx
  on public.document_requirements (requires_id);

-- -----------------------------------------------------------------------------
-- Row level security
-- -----------------------------------------------------------------------------
alter table public.schemes               enable row level security;
alter table public.scheme_rules          enable row level security;
alter table public.documents             enable row level security;
alter table public.scheme_documents      enable row level security;
alter table public.document_requirements enable row level security;

create policy "schemes_select_public"
  on public.schemes for select
  to anon, authenticated
  using (true);

create policy "scheme_rules_select_public"
  on public.scheme_rules for select
  to anon, authenticated
  using (true);

create policy "documents_select_public"
  on public.documents for select
  to anon, authenticated
  using (true);

create policy "scheme_documents_select_public"
  on public.scheme_documents for select
  to anon, authenticated
  using (true);

create policy "document_requirements_select_public"
  on public.document_requirements for select
  to anon, authenticated
  using (true);
