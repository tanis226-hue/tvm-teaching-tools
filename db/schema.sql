create extension if not exists pgcrypto;

create table if not exists sessions (
  id               uuid primary key default gen_random_uuid(),
  code             text unique not null,
  instructor_token text not null,
  created_at       timestamptz not null default now(),
  closed_at        timestamptz
);

-- Optional, instructor-supplied, shown in the header on the projector. Added
-- after the first release, so this doubles as the migration: re-running
-- schema.sql upgrades an existing database as well as creating a new one.
alter table sessions add column if not exists label text;

create table if not exists submissions (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references sessions(id) on delete cascade,
  device_hash        text not null,
  current_age        int not null check (current_age between 16 and 70),
  retirement_age     int not null check (retirement_age between 45 and 80),
  desired_income     numeric not null check (desired_income between 500 and 50000),
  match_rate         numeric not null default 0 check (match_rate between 0 and 1),
  first_withdrawal   numeric not null,
  lump_sum           numeric not null,
  first_contribution numeric not null,
  created_at         timestamptz not null default now(),
  unique (session_id, device_hash)
);

create index if not exists submissions_session_idx on submissions (session_id);
