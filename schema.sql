-- 1. Create the rooms table
create table if not exists public.rooms (
  id text primary key,
  is_revealed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.rooms enable row level security;

-- 3. Create policies for public access (so teams can vote without logging in)
create policy "Allow public read access" on public.rooms
  for select using (true);

create policy "Allow public insert access" on public.rooms
  for insert with check (true);

create policy "Allow public update access" on public.rooms
  for update using (true);

-- 4. Enable Realtime for the rooms table
alter publication supabase_realtime add table public.rooms;
