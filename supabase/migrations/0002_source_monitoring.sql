-- =============================================================================
-- 0002_source_monitoring.sql
-- Claim What's Yours: source change monitoring and admin review queue.
--
-- Design:
--   * source_snapshots  last known content hash of each scheme's official source
--   * review_queue      detected source changes awaiting a human decision
--
--   * Nothing here edits scheme rules. Approving a queue item only records that
--     someone reviewed the change and refreshes the snapshot hash.
--
-- Access:
--   * Row level security is enabled on both tables with NO policies, so anon and
--     authenticated roles cannot read or write them. Access goes through the
--     service role (which bypasses RLS) from server route handlers only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- source_snapshots  (scheme -> last known hash of its source page)
-- -----------------------------------------------------------------------------
create table if not exists public.source_snapshots (
  scheme_id     text primary key,
  source_url    text not null,
  content_hash  text not null,
  fetched_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- review_queue  (detected source change awaiting review)
-- -----------------------------------------------------------------------------
create table if not exists public.review_queue (
  id          bigint generated always as identity primary key,
  scheme_id   text not null,
  source_url  text not null,
  old_hash    text,
  new_hash    text not null,
  status      text not null default 'pending'
                check (status in ('pending', 'approved', 'dismissed')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists review_queue_status_idx
  on public.review_queue (status);

-- -----------------------------------------------------------------------------
-- Row level security (no policies: service role only)
-- -----------------------------------------------------------------------------
alter table public.source_snapshots enable row level security;
alter table public.review_queue     enable row level security;
