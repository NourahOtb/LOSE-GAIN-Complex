-- Task 12: guardian ↔ coach chat.
-- One conversation per guardian + coach + member. Only those two can read and write;
-- the manager and super admin can READ (oversight, disclosed in the terms).

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid not null references public.profiles(id) on delete cascade,
  kid_id uuid not null references public.kids(id) on delete cascade,
  last_message_at timestamptz,
  last_sender_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (parent_id, coach_id, kid_id)
);
create index conversations_parent_idx on public.conversations(parent_id);
create index conversations_coach_idx on public.conversations(coach_id);
create index conversations_kid_idx on public.conversations(kid_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_conversation_idx on public.messages(conversation_id, created_at);
create index messages_sender_idx on public.messages(sender_id);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create or replace function public.can_oversee_chats()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(public.current_app_role() in ('super_admin','manager'), false) $$;
revoke execute on function public.can_oversee_chats() from public, anon;

create policy conv_select on public.conversations for select to authenticated
  using (parent_id = (select auth.uid()) or coach_id = (select auth.uid()) or public.can_oversee_chats());
-- conversations are opened through open_conversation()

create policy msg_select on public.messages for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id
                 and (c.parent_id = (select auth.uid()) or c.coach_id = (select auth.uid())))
         or public.can_oversee_chats());
create policy msg_insert on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid())
              and exists (select 1 from public.conversations c where c.id = conversation_id
                          and (c.parent_id = (select auth.uid()) or c.coach_id = (select auth.uid()))));
-- messages can't be edited or deleted; read receipts go through mark_chat_read()

-- keep the conversation's "last message" up to date
create or replace function public.messages_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.conversations set last_message_at = new.created_at, last_sender_id = new.sender_id where id = new.conversation_id;
  return new;
end $$;
revoke execute on function public.messages_after_insert() from public, anon, authenticated;
create trigger messages_after_insert after insert on public.messages for each row execute function public.messages_after_insert();

-- guardian: open (or find) the chat with a coach about one of their members.
-- coach: open (or find) the chat with a member's guardian (p_coach is ignored).
create or replace function public.open_conversation(p_kid uuid, p_coach uuid default null)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_parent uuid; v_coach uuid; v_id uuid; v_role public.app_role := public.current_app_role();
begin
  select parent_id into v_parent from public.kids where id = p_kid;
  if v_parent is null then raise exception 'not found'; end if;
  if v_role = 'coach' then
    v_coach := auth.uid();
  elsif v_parent = auth.uid() then
    v_coach := p_coach;
    if not exists (select 1 from public.profiles where id = v_coach and role = 'coach' and is_active) then raise exception 'not a coach'; end if;
  else
    raise exception 'not allowed';
  end if;
  insert into public.conversations (parent_id, coach_id, kid_id) values (v_parent, v_coach, p_kid)
  on conflict (parent_id, coach_id, kid_id) do update set parent_id = excluded.parent_id
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.open_conversation(uuid, uuid) from public, anon;

-- mark the other person's messages in a conversation as read
create or replace function public.mark_chat_read(p_conversation uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.conversations where id = p_conversation and (parent_id = auth.uid() or coach_id = auth.uid())) then
    raise exception 'not allowed';
  end if;
  update public.messages set read_at = now() where conversation_id = p_conversation and sender_id <> auth.uid() and read_at is null;
end $$;
revoke execute on function public.mark_chat_read(uuid) from public, anon;

-- guardians and coaches see each other's names in their chats
create or replace function public.chat_names()
returns table (id uuid, full_name text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.full_name from public.profiles p
  where p.id in (select parent_id from public.conversations where coach_id = auth.uid()
                 union select coach_id from public.conversations where parent_id = auth.uid())
$$;
revoke execute on function public.chat_names() from public, anon;

-- live updates in the app
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
