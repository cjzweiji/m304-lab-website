-- Run this once in Supabase SQL Editor for an existing M304 project.
-- It adds username/gender/avatar profile support without recreating any tables.

alter table public.profiles add column if not exists gender text not null default 'prefer_not';
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists profile_completed_at timestamptz;
alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles add constraint profiles_gender_check
  check (gender in ('female', 'male', 'non_binary', 'prefer_not'));

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

grant execute on function public.update_my_profile(text, text, text) to authenticated;

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
