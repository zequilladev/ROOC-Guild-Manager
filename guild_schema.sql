-- ============================================================
-- Guild Management Website — Supabase Schema
-- Paste this into Supabase > SQL Editor > New Query > Run
-- ============================================================

create extension if not exists "uuid-ossp";

-- ── Users ────────────────────────────────────────────────────
-- Mirrors Supabase auth.users (created automatically on Discord login)
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  discord_id    text unique not null,
  discord_username text not null,
  discord_avatar   text,
  last_seen_at  timestamptz default now(),
  created_at    timestamptz default now()
);

-- Auto-create a profile row when a user signs up via Discord OAuth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, discord_id, discord_username, discord_avatar)
  values (
    new.id,
    new.raw_user_meta_data->>'provider_id',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Guilds ───────────────────────────────────────────────────
create table public.guilds (
  id          uuid default uuid_generate_v4() primary key,
  name        text not null,
  description text,
  owner_id    uuid references public.profiles(id) on delete restrict not null,
  invite_code text unique default substr(md5(random()::text), 0, 9),
  created_at  timestamptz default now()
);

-- ── Guild members ────────────────────────────────────────────
create type member_role as enum ('leader', 'officer', 'member');

create table public.guild_members (
  id        uuid default uuid_generate_v4() primary key,
  guild_id  uuid references public.guilds(id) on delete cascade not null,
  user_id   uuid references public.profiles(id) on delete cascade not null,
  role      member_role default 'member' not null,
  is_active boolean default true,
  joined_at timestamptz default now(),
  unique(guild_id, user_id)
);

-- ── Characters (in-game profiles) ───────────────────────────
create table public.characters (
  id             uuid default uuid_generate_v4() primary key,
  user_id        uuid references public.profiles(id) on delete cascade not null,
  guild_id       uuid references public.guilds(id) on delete cascade not null,
  character_name text not null,
  class          text,
  level          integer default 1,
  server         text,
  notes          text,
  updated_at     timestamptz default now(),
  created_at     timestamptz default now()
);

-- ── Events ───────────────────────────────────────────────────
create type event_status as enum ('upcoming', 'ongoing', 'completed', 'cancelled');

create table public.events (
  id           uuid default uuid_generate_v4() primary key,
  guild_id     uuid references public.guilds(id) on delete cascade not null,
  created_by   uuid references public.profiles(id) on delete set null,
  title        text not null,
  description  text,
  event_type   text default 'general',       -- e.g. 'raid', 'meeting', 'pvp'
  status       event_status default 'upcoming',
  scheduled_at timestamptz not null,
  created_at   timestamptz default now()
);

-- ── Event attendance ─────────────────────────────────────────
create type attendance_status as enum ('present', 'absent', 'excused');

create table public.event_attendance (
  id       uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  user_id  uuid references public.profiles(id) on delete cascade not null,
  status   attendance_status default 'absent',
  noted_by uuid references public.profiles(id) on delete set null,
  unique(event_id, user_id)
);

-- ── Announcements ────────────────────────────────────────────
create table public.announcements (
  id         uuid default uuid_generate_v4() primary key,
  guild_id   uuid references public.guilds(id) on delete cascade not null,
  created_by uuid references public.profiles(id) on delete set null,
  title      text not null,
  content    text not null,
  is_pinned  boolean default false,
  created_at timestamptz default now()
);

-- ── Applications ─────────────────────────────────────────────
create type application_status as enum ('pending', 'approved', 'rejected');

create table public.applications (
  id          uuid default uuid_generate_v4() primary key,
  guild_id    uuid references public.guilds(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  message     text,
  status      application_status default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at  timestamptz default now(),
  unique(guild_id, user_id)   -- one active application per user per guild
);

-- ============================================================
-- Row Level Security (RLS)
-- Supabase requires RLS enabled on all public tables
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.guilds          enable row level security;
alter table public.guild_members   enable row level security;
alter table public.characters      enable row level security;
alter table public.events          enable row level security;
alter table public.event_attendance enable row level security;
alter table public.announcements   enable row level security;
alter table public.applications    enable row level security;

-- Users: anyone can view, only self can edit
create policy "users_select" on public.profiles for select using (true);
create policy "users_update" on public.profiles for update using (auth.uid() = id);

-- Guilds: anyone can view; only owner can update/delete
create policy "guilds_select" on public.guilds for select using (true);
create policy "guilds_insert" on public.guilds for insert with check (auth.uid() = owner_id);
create policy "guilds_update" on public.guilds for update using (auth.uid() = owner_id);
create policy "guilds_delete" on public.guilds for delete using (auth.uid() = owner_id);

-- Guild members: visible to fellow guild members only
create policy "members_select" on public.guild_members for select
  using (exists (
    select 1 from public.guild_members gm
    where gm.guild_id = guild_members.guild_id and gm.user_id = auth.uid()
  ));

-- Characters: visible to guild members; editable by the owner
create policy "chars_select" on public.characters for select
  using (exists (
    select 1 from public.guild_members gm
    where gm.guild_id = characters.guild_id and gm.user_id = auth.uid()
  ));
create policy "chars_insert" on public.characters for insert with check (auth.uid() = user_id);
create policy "chars_update" on public.characters for update using (auth.uid() = user_id);

-- Events: visible to guild members; leaders/officers can create
create policy "events_select" on public.events for select
  using (exists (
    select 1 from public.guild_members gm
    where gm.guild_id = events.guild_id and gm.user_id = auth.uid()
  ));
create policy "events_insert" on public.events for insert
  with check (exists (
    select 1 from public.guild_members gm
    where gm.guild_id = events.guild_id
      and gm.user_id = auth.uid()
      and gm.role in ('leader', 'officer')
  ));

-- Attendance: visible to guild members
create policy "attendance_select" on public.event_attendance for select
  using (exists (
    select 1 from public.events e
    join public.guild_members gm on gm.guild_id = e.guild_id
    where e.id = event_attendance.event_id and gm.user_id = auth.uid()
  ));

-- Announcements: visible to guild members; leaders/officers can post
create policy "announce_select" on public.announcements for select
  using (exists (
    select 1 from public.guild_members gm
    where gm.guild_id = announcements.guild_id and gm.user_id = auth.uid()
  ));
create policy "announce_insert" on public.announcements for insert
  with check (exists (
    select 1 from public.guild_members gm
    where gm.guild_id = announcements.guild_id
      and gm.user_id = auth.uid()
      and gm.role in ('leader', 'officer')
  ));

-- Applications: applicant sees own; leaders/officers see all for their guild
create policy "apps_select" on public.applications for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.guild_members gm
      where gm.guild_id = applications.guild_id
        and gm.user_id = auth.uid()
        and gm.role in ('leader', 'officer')
    )
  );
create policy "apps_insert" on public.applications for insert with check (auth.uid() = user_id);