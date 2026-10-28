-- Database setup for the site. Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run again: every statement is idempotent.
-- (Already applied to project oyezwnkliaudduohmous on 2026-10-28.)

-- =====================================================================
-- Helpers live in a private schema so they are not callable through the API
-- =====================================================================
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- =====================================================================
-- 1. Progress marks ("In review" / "Done") per signed-in user
-- =====================================================================
create table if not exists public.user_progress (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  question_id text        not null,
  status      text        not null check (status in ('review', 'done', 'none')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);
alter table public.user_progress enable row level security;
drop policy if exists "read own progress"   on public.user_progress;
drop policy if exists "insert own progress" on public.user_progress;
drop policy if exists "update own progress" on public.user_progress;
drop policy if exists "delete own progress" on public.user_progress;
create policy "read own progress"   on public.user_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own progress" on public.user_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own progress" on public.user_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own progress" on public.user_progress for delete to authenticated using ((select auth.uid()) = user_id);

-- Usage totals for the site owner (run from the SQL editor to see all users).
create or replace view public.progress_summary
with (security_invoker = true) as
select status, count(*) as marks, count(distinct user_id) as users
from public.user_progress
group by status;

-- =====================================================================
-- 2. Admins. Add yourself after signing in once on the site:
--    insert into public.admins (user_id)
--    select id from auth.users where email = 'you@example.com';
-- =====================================================================
create table if not exists public.admins (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "see own admin row" on public.admins;
create policy "see own admin row" on public.admins for select to authenticated using ((select auth.uid()) = user_id);

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

-- =====================================================================
-- 3. Admin edits. A row overrides the built-in question with the same id,
--    adds a new question, or (deleted = true) hides a question from the site.
-- =====================================================================
create table if not exists public.questions (
  id         text primary key check (id ~ '^[a-z]+-[0-9]{3,}$'),
  topic      text not null,
  level      text not null check (level in ('Basic', 'Mid', 'Senior')),
  type       text not null check (type in ('concept', 'scenario', 'code', 'output', 'design')),
  question   text not null check (length(question) between 5 and 20000),
  answer     text not null check (length(answer) between 1 and 200000),
  clouds     text[],                       -- null = tag automatically
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
alter table public.questions enable row level security;
drop policy if exists "anyone can read questions" on public.questions;
drop policy if exists "admins insert questions"   on public.questions;
drop policy if exists "admins update questions"   on public.questions;
drop policy if exists "admins delete questions"   on public.questions;
create policy "anyone can read questions" on public.questions for select using (true);
create policy "admins insert questions"   on public.questions for insert to authenticated with check ((select private.is_admin()));
create policy "admins update questions"   on public.questions for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete questions"   on public.questions for delete to authenticated using ((select private.is_admin()));

-- =====================================================================
-- 4. History: every update or delete keeps the previous version
-- =====================================================================
create table if not exists public.question_history (
  history_id bigint generated always as identity primary key,
  id         text not null,
  topic      text, level text, type text,
  question   text, answer text, clouds text[], deleted boolean,
  action     text not null,                -- update | delete
  changed_at timestamptz not null default now(),
  changed_by uuid
);
create index if not exists question_history_id_idx on public.question_history (id, changed_at desc);
alter table public.question_history enable row level security;
drop policy if exists "admins read history" on public.question_history;
create policy "admins read history" on public.question_history for select to authenticated using ((select private.is_admin()));

create or replace function private.log_question_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.question_history (id, topic, level, type, question, answer, clouds, deleted, action, changed_by)
  values (old.id, old.topic, old.level, old.type, old.question, old.answer, old.clouds, old.deleted, lower(tg_op), (select auth.uid()));
  if tg_op = 'DELETE' then
    return old;
  end if;
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end $$;
revoke all on function private.log_question_change() from public, anon, authenticated;

drop trigger if exists questions_history on public.questions;
create trigger questions_history
  before update or delete on public.questions
  for each row execute function private.log_question_change();

-- Older versions of this file created these in the public schema
drop function if exists public.log_question_change();
drop function if exists public.is_admin();
