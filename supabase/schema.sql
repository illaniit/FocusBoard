create table if not exists public.focusboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  board_key text not null default 'default',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint focusboard_snapshots_board_key_length check (char_length(board_key) between 1 and 80),
  constraint focusboard_snapshots_data_is_object check (jsonb_typeof(data) = 'object'),
  constraint focusboard_snapshots_data_size check (pg_column_size(data) < 1048576),
  unique (user_id, board_key)
);

alter table public.focusboard_snapshots enable row level security;
alter table public.focusboard_snapshots force row level security;

revoke all on table public.focusboard_snapshots from anon;
grant select, insert, update, delete on table public.focusboard_snapshots to authenticated;

create or replace function public.set_focusboard_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_focusboard_updated_at on public.focusboard_snapshots;
create trigger set_focusboard_updated_at
  before update on public.focusboard_snapshots
  for each row
  execute function public.set_focusboard_updated_at();

drop policy if exists "Users can read their FocusBoard" on public.focusboard_snapshots;
drop policy if exists "Users can insert their FocusBoard" on public.focusboard_snapshots;
drop policy if exists "Users can update their FocusBoard" on public.focusboard_snapshots;
drop policy if exists "Users can delete their FocusBoard" on public.focusboard_snapshots;

create policy "Users can read their FocusBoard"
  on public.focusboard_snapshots
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert their FocusBoard"
  on public.focusboard_snapshots
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their FocusBoard"
  on public.focusboard_snapshots
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their FocusBoard"
  on public.focusboard_snapshots
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
