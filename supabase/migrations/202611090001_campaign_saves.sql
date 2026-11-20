-- Prepared for optional cloud saving in Phase 6. Not applied by this scaffold.
create table public.campaign_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 65536
  ),
  updated_at timestamptz not null default now()
);

create function public.touch_campaign_save()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger campaign_save_timestamp before update on public.campaign_saves
for each row execute function public.touch_campaign_save();

alter table public.campaign_saves enable row level security;
revoke all on public.campaign_saves from anon;
grant select, insert, update, delete on public.campaign_saves to authenticated;

create policy "Read own campaign save" on public.campaign_saves
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own campaign save" on public.campaign_saves
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own campaign save" on public.campaign_saves
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Delete own campaign save" on public.campaign_saves
for delete to authenticated using ((select auth.uid()) = user_id);
