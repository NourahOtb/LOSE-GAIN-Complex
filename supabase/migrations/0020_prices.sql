-- Task 14f: prices and discounts saved in the database (the owner edits them in the dashboard).
-- One saved price list (same shape as DEFAULT_PRICING in packages/shared/src/pricing.ts).
-- The app, the register function and the AI assistant read it; anything missing falls back to the
-- built-in prices (pricingFrom()). New prices apply to new registrations only: existing ones keep theirs.

create table public.pricing (
  id smallint primary key default 1 check (id = 1),
  config jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index pricing_updated_by_idx on public.pricing(updated_by);
alter table public.pricing enable row level security;
create policy pricing_select on public.pricing for select to authenticated using (true);
-- written only through save_pricing()

create table public.pricing_history (
  id uuid primary key default gen_random_uuid(),
  previous jsonb not null,
  config jsonb not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index pricing_history_changed_by_idx on public.pricing_history(changed_by);
create index pricing_history_changed_at_idx on public.pricing_history(changed_at desc);
alter table public.pricing_history enable row level security;
create policy pricing_history_select on public.pricing_history for select to authenticated using (public.is_staff());

insert into public.pricing (id, config) values (1, '{"kids":{"1":{"3":30,"4":35,"5":40},"2":{"3":60,"4":70,"5":80},"4":{"2":65,"3":90,"4":105,"5":120,"6":130}},"bjjOnlyDays":[5,6],"adults":{"2":75,"3":90},"adultDays":["sun","tue","thu"],"adultBjj":{"male":{"1":{"3":35,"4":40,"5":45},"2":{"3":70,"4":80,"5":90},"4":{"2":75,"3":100,"4":110,"5":125}},"female":{"1":{"3":35,"4":40,"5":45},"2":{"3":70,"4":80,"5":90},"4":{"2":75,"3":90,"4":105,"5":120}}},"adultBjjDays":["sun","mon","tue","wed","thu"],"openPool":40,"family":{"2":7,"3":10,"4":12,"5":15},"months":{"3":15,"6":25,"12":30},"combineDiscounts":"add"}');

-- owner only; every number checked (prices 0–9999 KD with up to 3 decimals, discounts 0–100 %)
create or replace function public.save_pricing(p_config jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_old jsonb; v_bad int;
begin
  if public.current_app_role() is distinct from 'super_admin' then raise exception 'not allowed'; end if;
  if jsonb_typeof(p_config) <> 'object'
     or exists (select 1 from unnest(array['kids','adults','adultBjj','family','months']) k where jsonb_typeof(p_config -> k) is distinct from 'object') then
    raise exception 'bad_config';
  end if;

  -- every price must be a number from 0 to 9999.999
  v_bad := (select count(*) from jsonb_path_query(p_config, '$.kids.*.* ? (@.type() != "number" || @ < 0 || @ > 9999.999)'))
         + (select count(*) from jsonb_path_query(p_config, '$.adults.* ? (@.type() != "number" || @ < 0 || @ > 9999.999)'))
         + (select count(*) from jsonb_path_query(p_config, '$.adultBjj.*.*.* ? (@.type() != "number" || @ < 0 || @ > 9999.999)'));
  if v_bad > 0 then raise exception 'bad_price'; end if;
  if jsonb_typeof(p_config -> 'openPool') <> 'number' or (p_config ->> 'openPool')::numeric not between 0 and 9999.999 then raise exception 'bad_price'; end if;
  if exists (select 1 from jsonb_path_query(p_config, '$.family.*') x where jsonb_typeof(x) <> 'number' or x::text::numeric not between 0 and 100)
     or exists (select 1 from jsonb_path_query(p_config, '$.months.*') x where jsonb_typeof(x) <> 'number' or x::text::numeric not between 0 and 100) then
    raise exception 'bad_percent';
  end if;

  select config into v_old from public.pricing where id = 1;
  -- the structure (days, packages) stays as it is; only the numbers change
  p_config := v_old || jsonb_build_object(
    'kids', p_config -> 'kids', 'adults', p_config -> 'adults', 'adultBjj', p_config -> 'adultBjj',
    'openPool', p_config -> 'openPool', 'family', p_config -> 'family', 'months', p_config -> 'months');
  if p_config = v_old then return; end if;

  insert into public.pricing_history (previous, config, changed_by) values (v_old, p_config, auth.uid());
  update public.pricing set config = p_config, updated_by = auth.uid(), updated_at = now() where id = 1;
end $$;
revoke execute on function public.save_pricing(jsonb) from public, anon;
