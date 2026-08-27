-- Run this once in Supabase SQL Editor before publishing the site.
create extension if not exists pgcrypto;

do $$ begin
  create type public.member_role as enum ('admin', 'moderator', 'member');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '新成员' check (char_length(display_name) between 1 and 24),
  gender text not null default 'prefer_not' check (gender in ('female', 'male', 'non_binary', 'prefer_not')),
  avatar_url text,
  profile_completed_at timestamptz,
  role public.member_role not null default 'member',
  invited_by uuid references public.profiles(id) on delete set null,
  invited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Safe migration for projects that already have the profiles table.
alter table public.profiles add column if not exists gender text not null default 'prefer_not';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists profile_completed_at timestamptz;
alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles add constraint profiles_gender_check
  check (gender in ('female', 'male', 'non_binary', 'prefer_not'));

create unique index if not exists profiles_email_lower_key on public.profiles (lower(email));

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint study_sessions_time_order check (ended_at is null or ended_at >= started_at)
);

create unique index if not exists study_sessions_one_open_per_user
  on public.study_sessions(user_id) where ended_at is null;
create index if not exists study_sessions_leaderboard_index
  on public.study_sessions(started_at, user_id) where ended_at is not null;

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('algorithm', 'software', 'competition', 'recruitment')),
  title text not null check (char_length(title) between 1 and 80),
  excerpt text not null check (char_length(excerpt) between 1 and 1000),
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists topics_created_at_index on public.topics(created_at desc);
create index if not exists topics_category_index on public.topics(category, created_at desc);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists replies_topic_created_at_index on public.replies(topic_id, created_at);

create table if not exists public.invitation_audit (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  recipient_id uuid references public.profiles(id) on delete set null,
  invited_by uuid not null references public.profiles(id) on delete restrict,
  assigned_role public.member_role not null default 'member',
  invite_code_hash text not null,
  status text not null default 'sent' check (status in ('sent', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists invitation_audit_email_index on public.invitation_audit(lower(email), created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists topics_touch_updated_at on public.topics;
create trigger topics_touch_updated_at before update on public.topics
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'moderator')
  );
$$;

create or replace function public.set_my_display_name(p_display_name text)
returns void language plpgsql security definer set search_path = public as $$
declare
  cleaned_name text := btrim(p_display_name);
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if char_length(cleaned_name) not between 1 and 24 then
    raise exception 'Display name must contain 1 to 24 characters';
  end if;
  update public.profiles set display_name = cleaned_name where id = auth.uid();
end;
$$;

create or replace function public.update_my_profile(
  p_display_name text,
  p_gender text default 'prefer_not',
  p_avatar_url text default null
)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  cleaned_name text := btrim(p_display_name);
  cleaned_gender text := coalesce(nullif(btrim(p_gender), ''), 'prefer_not');
  updated_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if char_length(cleaned_name) not between 1 and 24 then
    raise exception 'Display name must contain 1 to 24 characters';
  end if;
  if cleaned_gender not in ('female', 'male', 'non_binary', 'prefer_not') then
    raise exception 'Invalid gender';
  end if;
  if p_avatar_url is not null and char_length(p_avatar_url) > 1000 then
    raise exception 'Avatar URL is too long';
  end if;
  update public.profiles
    set display_name = cleaned_name,
        gender = cleaned_gender,
        avatar_url = nullif(btrim(p_avatar_url), ''),
        profile_completed_at = now()
    where id = auth.uid()
    returning * into updated_profile;
  if not found then raise exception 'Profile not found'; end if;
  return updated_profile;
end;
$$;

create or replace function public.complete_my_invitation()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.invitation_audit
    set status = 'accepted', accepted_at = now()
    where recipient_id = auth.uid() and status = 'sent';
end;
$$;

create or replace function public.start_study_session()
returns public.study_sessions language plpgsql security definer set search_path = public as $$
declare
  open_session public.study_sessions;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into open_session from public.study_sessions
    where user_id = auth.uid() and ended_at is null order by started_at desc limit 1;
  if found then return open_session; end if;
  insert into public.study_sessions(user_id) values (auth.uid()) returning * into open_session;
  return open_session;
end;
$$;

create or replace function public.end_study_session(p_session_id uuid)
returns public.study_sessions language plpgsql security definer set search_path = public as $$
declare
  completed_session public.study_sessions;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  update public.study_sessions
    set ended_at = now()
    where id = p_session_id and user_id = auth.uid() and ended_at is null
    returning * into completed_session;
  if not found then raise exception 'Active study session not found'; end if;
  return completed_session;
end;
$$;

create or replace view public.study_leaderboard
with (security_invoker = true) as
select
  row_number() over (order by sum(extract(epoch from s.ended_at - s.started_at)) desc, p.display_name) as rank,
  p.id as user_id,
  p.display_name,
  floor(sum(extract(epoch from s.ended_at - s.started_at)) / 60)::integer as total_minutes,
  floor(sum(extract(epoch from s.ended_at - s.started_at)) filter (
    where s.started_at >= date_trunc('week', now())
  ) / 60)::integer as weekly_minutes,
  floor(sum(extract(epoch from s.ended_at - s.started_at)) filter (
    where s.started_at >= date_trunc('month', now())
  ) / 60)::integer as monthly_minutes
from public.profiles p
join public.study_sessions s on s.user_id = p.id and s.ended_at is not null
group by p.id, p.display_name;

alter table public.profiles enable row level security;
alter table public.study_sessions enable row level security;
alter table public.topics enable row level security;
alter table public.replies enable row level security;
alter table public.invitation_audit enable row level security;

drop policy if exists "authenticated members can view profiles" on public.profiles;
create policy "authenticated members can view profiles" on public.profiles
for select to authenticated using (true);

drop policy if exists "authenticated members can view study sessions" on public.study_sessions;
create policy "authenticated members can view study sessions" on public.study_sessions
for select to authenticated using (true);

drop policy if exists "members can view topics" on public.topics;
create policy "members can view topics" on public.topics
for select to authenticated using (true);
drop policy if exists "members can create own topics" on public.topics;
create policy "members can create own topics" on public.topics
for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "authors or moderators can update topics" on public.topics;
create policy "authors or moderators can update topics" on public.topics
for update to authenticated using (author_id = auth.uid() or public.is_staff())
with check (author_id = auth.uid() or public.is_staff());
drop policy if exists "authors or moderators can delete topics" on public.topics;
create policy "authors or moderators can delete topics" on public.topics
for delete to authenticated using (author_id = auth.uid() or public.is_staff());

drop policy if exists "members can view replies" on public.replies;
create policy "members can view replies" on public.replies
for select to authenticated using (true);
drop policy if exists "members can create own replies" on public.replies;
create policy "members can create own replies" on public.replies
for insert to authenticated with check (author_id = auth.uid());
drop policy if exists "authors or moderators can delete replies" on public.replies;
create policy "authors or moderators can delete replies" on public.replies
for delete to authenticated using (author_id = auth.uid() or public.is_staff());

drop policy if exists "admins can view invitation audit" on public.invitation_audit;
create policy "admins can view invitation audit" on public.invitation_audit
for select to authenticated using (public.is_admin());

grant execute on function public.set_my_display_name(text) to authenticated;
grant execute on function public.update_my_profile(text, text, text) to authenticated;
grant execute on function public.complete_my_invitation() to authenticated;
grant execute on function public.start_study_session() to authenticated;
grant execute on function public.end_study_session(uuid) to authenticated;
grant select on public.study_leaderboard to authenticated;

-- Public avatars are stored under each member's own folder.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "members can upload own avatar" on storage.objects;
create policy "members can upload own avatar" on storage.objects
for insert to authenticated
with check (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'));

drop policy if exists "members can update own avatar" on storage.objects;
create policy "members can update own avatar" on storage.objects
for update to authenticated
using (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'))
with check (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'));

drop policy if exists "members can delete own avatar" on storage.objects;
create policy "members can delete own avatar" on storage.objects
for delete to authenticated
using (bucket_id = 'avatars' and name like (auth.uid()::text || '/%'));

-- First administrator bootstrap, performed once after creating a user in Supabase Auth:
-- insert into public.profiles (id, email, display_name, role)
-- values ('AUTH_USER_UUID', 'your-admin-email@example.com', '管理员名称', 'admin');
