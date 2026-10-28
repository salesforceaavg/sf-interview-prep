-- Run this once in Supabase: Dashboard -> SQL Editor -> New query -> paste -> Run.

create table if not exists public.user_progress (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  question_id text        not null,
  status      text        not null check (status in ('review', 'done', 'none')),
  updated_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- Row Level Security: every user can only see and change their own rows.
alter table public.user_progress enable row level security;

drop policy if exists "read own progress"   on public.user_progress;
drop policy if exists "insert own progress" on public.user_progress;
drop policy if exists "update own progress" on public.user_progress;
drop policy if exists "delete own progress" on public.user_progress;

create policy "read own progress"   on public.user_progress for select using (auth.uid() = user_id);
create policy "insert own progress" on public.user_progress for insert with check (auth.uid() = user_id);
create policy "update own progress" on public.user_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own progress" on public.user_progress for delete using (auth.uid() = user_id);

-- Optional: a quick usage view for you (the site owner). Run it from the SQL editor,
-- which bypasses RLS and shows totals. Through the public API it respects RLS,
-- so a signed-in visitor would only ever see counts for their own rows.
create or replace view public.progress_summary
with (security_invoker = true) as
select status, count(*) as marks, count(distinct user_id) as users
from public.user_progress
group by status;
