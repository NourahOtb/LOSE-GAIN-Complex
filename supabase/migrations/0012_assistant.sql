-- Task 13: AI assistant for guardians.
-- Hand-offs: what the assistant can't handle goes to reception, who reply from the admin dashboard.
-- Usage: a daily message limit per member (written only by the server function).

create table public.assistant_handoffs (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  summary text not null check (length(summary) between 1 and 1000),
  status text not null default 'open' check (status in ('open','answered')),
  reply text,
  answered_by uuid references public.profiles(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
create index assistant_handoffs_parent_idx on public.assistant_handoffs(parent_id);
create index assistant_handoffs_answered_by_idx on public.assistant_handoffs(answered_by);
alter table public.assistant_handoffs enable row level security;
create policy handoffs_select on public.assistant_handoffs for select to authenticated
  using (parent_id = (select auth.uid()) or public.is_staff());
-- created by the assistant server function; answered through answer_handoff()

create or replace function public.answer_handoff(p_id uuid, p_reply text)
returns void language plpgsql security definer set search_path = ''
as $$
declare h public.assistant_handoffs%rowtype;
begin
  if not public.is_staff() then raise exception 'not allowed'; end if;
  if length(btrim(coalesce(p_reply, ''))) = 0 then raise exception 'reply required'; end if;
  select * into h from public.assistant_handoffs where id = p_id;
  if h.id is null then raise exception 'not found'; end if;
  update public.assistant_handoffs set status = 'answered', reply = btrim(p_reply), answered_by = auth.uid(), answered_at = now() where id = p_id;
  insert into public.notifications (user_id, kind, title_en, body_en, title_ar, body_ar)
  values (h.parent_id, 'assistant_reply', 'Reception replied', btrim(p_reply), 'رد الاستقبال', btrim(p_reply));
end $$;
revoke execute on function public.answer_handoff(uuid, text) from public, anon;

create table public.assistant_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  messages integer not null default 0,
  primary key (user_id, day)
);
alter table public.assistant_usage enable row level security;
-- no policies: only the server function (service role) reads and writes it

-- count one message for today and say whether the member is still within the limit
create or replace function public.assistant_take(p_user uuid, p_limit integer)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v integer;
begin
  insert into public.assistant_usage (user_id, day, messages) values (p_user, (now() at time zone 'Asia/Kuwait')::date, 1)
  on conflict (user_id, day) do update set messages = public.assistant_usage.messages + 1
  returning messages into v;
  return v <= p_limit;
end $$;
revoke execute on function public.assistant_take(uuid, integer) from public, anon, authenticated;
