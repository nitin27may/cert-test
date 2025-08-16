-- Supabase schema for Exams, Questions, Sessions, and Session Questions
-- Run this in the Supabase SQL Editor (Project > SQL Editor)

-- Extensions (for UUIDs)
create extension if not exists pgcrypto;

-- Base tables
create table if not exists public.exams (
  id text primary key,
  title text not null,
  description text,
  total_questions integer not null default 0,
  networking_focus_percentage smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_topics (
  exam_id text not null references public.exams(id) on delete cascade,
  topic_key text not null,
  name text not null,
  modules text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_topics_unique unique (exam_id, topic_key)
);

-- Questions master catalog (source of truth)
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id text not null references public.exams(id) on delete cascade,
  source_question_id integer not null,
  topic_key text not null,
  module text,
  category text,
  type text not null check (type in ('single','multiple')),
  difficulty text not null check (difficulty in ('easy','medium','difficult')),
  question_text text not null,
  options text[] not null,
  correct_indices integer[] not null,
  explanation text,
  reasoning jsonb not null default '{}'::jsonb,
  reference jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_exam_src_unique unique (exam_id, source_question_id),
  constraint questions_topic_fk foreign key (exam_id, topic_key)
    references public.exam_topics (exam_id, topic_key) on delete restrict
);

-- Users' exam sessions (an instance per user per exam)
create table if not exists public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  exam_id text not null references public.exams(id) on delete cascade,
  status text not null default 'in-progress' check (status in ('created','in-progress','paused','completed','abandoned')),
  selected_topics text[] not null default '{}',
  question_limit integer,
  difficulty text,
  time_limit_seconds integer,
  progress integer not null default 0,
  score integer,
  correct_count integer,
  total_questions integer,
  time_spent_seconds integer,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Snapshot of questions for each session (order is fixed per session)
create table if not exists public.exam_session_questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.exam_sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  source_question_id integer not null,
  position integer not null,
  -- lightweight snapshot (no correct_indices to reduce cheating risk)
  question_text text not null,
  options text[] not null,
  topic_key text,
  module text,
  category text,
  difficulty text,
  -- user state
  user_answer_indices integer[] not null default '{}'::integer[],
  checked boolean not null default false,
  is_correct boolean,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  constraint session_question_position_unique unique (session_id, position)
);

-- Helpful indexes
create index if not exists idx_questions_exam on public.questions (exam_id);
create index if not exists idx_exam_topics_exam on public.exam_topics (exam_id);
create index if not exists idx_exam_session_by_user on public.exam_sessions (user_id, exam_id);
create index if not exists idx_exam_session_questions_session on public.exam_session_questions (session_id);

-- RLS policies
alter table public.exams enable row level security;
alter table public.exam_topics enable row level security;
alter table public.questions enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.exam_session_questions enable row level security;

-- Public read for reference data
create policy if not exists exams_read_all on public.exams for select using (true);
create policy if not exists exam_topics_read_all on public.exam_topics for select using (true);
create policy if not exists questions_read_all on public.questions for select using (true);

-- No insert/update/delete on master data for regular users (service role bypasses RLS)

-- Per-user access to sessions
create policy if not exists exam_sessions_select_own on public.exam_sessions
  for select using (auth.uid() = user_id);
create policy if not exists exam_sessions_insert_own on public.exam_sessions
  for insert with check (auth.uid() = user_id);
create policy if not exists exam_sessions_update_own on public.exam_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy if not exists exam_sessions_delete_own on public.exam_sessions
  for delete using (auth.uid() = user_id);

-- Session questions access via owning session
create policy if not exists session_questions_select_own on public.exam_session_questions
  for select using (exists (
    select 1 from public.exam_sessions s
    where s.id = exam_session_questions.session_id and s.user_id = auth.uid()
  ));
create policy if not exists session_questions_insert_own on public.exam_session_questions
  for insert with check (exists (
    select 1 from public.exam_sessions s
    where s.id = exam_session_questions.session_id and s.user_id = auth.uid()
  ));
create policy if not exists session_questions_update_own on public.exam_session_questions
  for update using (exists (
    select 1 from public.exam_sessions s
    where s.id = exam_session_questions.session_id and s.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.exam_sessions s
    where s.id = exam_session_questions.session_id and s.user_id = auth.uid()
  ));
create policy if not exists session_questions_delete_own on public.exam_session_questions
  for delete using (exists (
    select 1 from public.exam_sessions s
    where s.id = exam_session_questions.session_id and s.user_id = auth.uid()
  ));

-- RPCs

-- Create (or reuse) a session and materialize random questions
create or replace function public.create_or_resume_exam_session(
  p_exam_id text,
  p_selected_topics text[] default null,
  p_question_count integer default null,
  p_difficulty text default 'mix',
  p_time_limit_minutes integer default 90
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_total integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Try to reuse an in-progress/paused session
  select id into v_session_id
  from public.exam_sessions
  where user_id = v_user_id
    and exam_id = p_exam_id
    and status in ('in-progress','paused')
  order by last_activity_at desc
  limit 1;

  if v_session_id is not null then
    return v_session_id;
  end if;

  -- Create a new session
  insert into public.exam_sessions (
    user_id, exam_id, status, selected_topics, question_limit, difficulty, time_limit_seconds, progress, started_at, last_activity_at
  ) values (
    v_user_id, p_exam_id, 'in-progress', coalesce(p_selected_topics, '{}'), p_question_count, nullif(p_difficulty, '') , p_time_limit_minutes * 60, 0, now(), now()
  ) returning id into v_session_id;

  -- Select candidate questions
  with filtered as (
    select q.* from public.questions q
    where q.exam_id = p_exam_id
      and (p_selected_topics is null or array_length(p_selected_topics, 1) is null or q.topic_key = any(p_selected_topics))
      and (p_difficulty is null or lower(p_difficulty) = 'mix' or q.difficulty = lower(p_difficulty))
    order by random()
    limit coalesce(p_question_count, 50)
  ), numbered as (
    select 
      q.id as question_id,
      q.source_question_id,
      q.question_text,
      q.options,
      q.topic_key,
      q.module,
      q.category,
      q.difficulty,
      row_number() over (order by random()) as position
    from filtered q
  )
  insert into public.exam_session_questions (
    session_id, question_id, source_question_id, position, question_text, options, topic_key, module, category, difficulty
  )
  select v_session_id, question_id, source_question_id, position, question_text, options, topic_key, module, category, difficulty
  from numbered;

  select count(*) into v_total from public.exam_session_questions where session_id = v_session_id;
  update public.exam_sessions set total_questions = v_total where id = v_session_id;

  return v_session_id;
end;
$$;

grant execute on function public.create_or_resume_exam_session(text, text[], integer, text, integer) to authenticated, anon;

-- Finish a session: compute correctness and final stats
create or replace function public.finish_exam_session(
  p_session_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_total integer;
  v_correct integer;
  v_score integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Ownership check
  if not exists (
    select 1 from public.exam_sessions s where s.id = p_session_id and s.user_id = v_user_id
  ) then
    raise exception 'Not allowed';
  end if;

  -- Mark correctness per question (order-insensitive equality)
  update public.exam_session_questions sq
  set is_correct = (
    select coalesce(
      (select array_agg(x order by x) from unnest(sq.user_answer_indices) as t(x)) =
      (select array_agg(x order by x) from unnest(q.correct_indices) as t(x))
    , false)
    from public.questions q
    where q.id = sq.question_id
  ),
  checked = true,
  answered_at = coalesce(sq.answered_at, now())
  where sq.session_id = p_session_id;

  select count(*) into v_total from public.exam_session_questions where session_id = p_session_id;
  select count(*) into v_correct from public.exam_session_questions where session_id = p_session_id and is_correct is true;
  v_score := case when v_total > 0 then round((v_correct::numeric / v_total::numeric) * 100)::int else 0 end;

  update public.exam_sessions
  set status = 'completed',
      progress = 100,
      correct_count = v_correct,
      total_questions = v_total,
      score = v_score,
      time_spent_seconds = coalesce(time_spent_seconds, 0),
      completed_at = now(),
      last_activity_at = now()
  where id = p_session_id and user_id = v_user_id;
end;
$$;

grant execute on function public.finish_exam_session(uuid) to authenticated, anon;