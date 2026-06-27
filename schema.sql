-- 1. Create rooms table
create table if not exists public.rooms (
  id text primary key,
  is_revealed boolean default false not null,
  admin_id text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create participants table (with cascaded deletion)
create table if not exists public.participants (
  id text primary key, -- formatted as "room_id:user_id"
  room_id text references public.rooms(id) on delete cascade not null,
  user_id text not null,
  name text not null,
  vote text, -- nullable (contains estimate or null)
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Row Level Security (RLS)
alter table public.rooms enable row level security;
alter table public.participants enable row level security;

-- 4. Create policies for public access (no login required)
create policy "Allow public access to rooms" on public.rooms
  for all using (true) with check (true);

create policy "Allow public access to participants" on public.participants
  for all using (true) with check (true);

-- 5. Enable Realtime replication for both tables
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.participants;

-- 6. Cron Cleanup Function
-- Removes participants and rooms that have had no activity for over 2 hours.
create or replace function public.cleanup_inactive_rooms()
returns void as $$
begin
  -- Delete participants of rooms with no updates for 2 hours
  delete from public.participants
  where room_id in (
    select id from public.rooms
    where updated_at < now() - interval '2 hours'
  );

  -- Delete rooms with no updates for 2 hours
  delete from public.rooms
  where updated_at < now() - interval '2 hours';
end;
$$ language plpgsql;
