-- ============================================================================
-- HITTLERS GAME - SUPABASE DATABASE & STORAGE SCHEMA
-- ============================================================================

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Player Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_color text default '#2ed573',
  custom_skin_url text,
  total_matches integer default 0,
  runner_escapes integer default 0,
  hitter_clean_sweeps integer default 0,
  total_whacks integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Row Level Security (RLS) for Profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." 
  on public.profiles for select using (true);

create policy "Users can insert their own profile." 
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile." 
  on public.profiles for update using (auth.uid() = id);

-- 3. Match History Table
create table if not exists public.match_history (
  id uuid default uuid_generate_v4() primary key,
  room_code text not null,
  hitter_username text not null,
  winner text not null check (winner in ('RUNNERS', 'HITTER')),
  round_duration_seconds numeric(5, 2) not null,
  runners_knocked_out integer default 0,
  total_runners integer default 0,
  ended_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.match_history enable row level security;
create policy "Match history is viewable by everyone." on public.match_history for select using (true);
create policy "Authenticated game server can insert match history." on public.match_history for insert with check (true);

-- 4. Global Leaderboard View
create or replace view public.leaderboard as
select 
  username,
  avatar_color,
  total_matches,
  runner_escapes,
  hitter_clean_sweeps,
  total_whacks,
  (runner_escapes * 100 + hitter_clean_sweeps * 250 + total_whacks * 25) as score
from public.profiles
order by score desc;

-- 5. Supabase Storage Bucket for 3D Models (.glb / .gltf)
-- Execute this to create a public storage bucket for 3D character avatars & props:
insert into storage.buckets (id, name, public) 
values ('game-assets', 'game-assets', true)
on conflict (id) do nothing;

-- Storage Policy: Allow public read access to 3D models and textures
create policy "Public 3D Asset Access" 
  on storage.objects for select 
  using (bucket_id = 'game-assets');

-- Storage Policy: Allow authenticated uploads
create policy "Authenticated Asset Uploads" 
  on storage.objects for insert 
  with check (bucket_id = 'game-assets' and auth.role() = 'authenticated');
