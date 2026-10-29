-- ============ Migration: 20261029000001_core.sql ============
-- Types
create extension if not exists pg_trgm;
create type public.app_role as enum ('ADMIN','EDITOR','VIEWER');
create type public.account_status as enum ('ACTIVE','SUSPENDED');

-- Functions are NOT executable by clients unless granted explicitly.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role public.app_role not null default 'VIEWER',
  status public.account_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);
-- Single-admin invariant, enforced by the database itself
create unique index one_admin_only on public.profiles ((role)) where role = 'ADMIN';

-- ============ Helper functions (SECURITY DEFINER avoids recursive RLS) ============
create function public.current_app_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and status = 'ACTIVE'
$$;
create function public.is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'ACTIVE')
$$;
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() = 'ADMIN', false)
$$;
create function public.can_write() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_app_role() in ('ADMIN','EDITOR'), false)
$$;
grant execute on function public.current_app_role(), public.is_active(),
  public.is_admin(), public.can_write() to authenticated;

-- ============ New-user trigger: ALWAYS VIEWER, metadata role ignored ============
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email,
          coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.sync_user_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;
create trigger on_auth_user_email after update of email on auth.users
  for each row when (old.email is distinct from new.email) execute function public.sync_user_email();

-- ============ Admin protection ============
-- The admin row can't be demoted, suspended or deleted, except by an operator who
-- explicitly runs: SET LOCAL notevault.allow_admin_change = 'on';  (SQL editor / psql only)
create function public.profiles_guard() returns trigger
language plpgsql set search_path = public as $$
declare bypass boolean := coalesce(current_setting('notevault.allow_admin_change', true), '') = 'on';
begin
  if tg_op = 'DELETE' then
    if old.role = 'ADMIN' and not bypass then
      raise exception 'The administrator account cannot be deleted';
    end if;
    return old;
  end if;
  if old.role = 'ADMIN' and not bypass and (new.role <> 'ADMIN' or new.status <> 'ACTIVE') then
    raise exception 'The administrator cannot be demoted or suspended';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_guard_trg before update or delete on public.profiles
  for each row execute function public.profiles_guard();

-- ============ files ============
create table public.files (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 255),
  description text check (char_length(description) <= 2000),
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400),
  category text,
  tags text[] not null default '{}',
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id)
);
create index files_active_idx on public.files (created_at desc) where deleted_at is null;
create index files_uploader_idx on public.files (uploaded_by);
create index files_name_trgm on public.files using gin (name gin_trgm_ops);
create index files_tags_gin on public.files using gin (tags);

create function public.files_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    new.deleted_by := auth.uid();                     -- cannot be spoofed
  elsif new.deleted_at is null and old.deleted_at is not null then
    if not public.is_admin() then raise exception 'Only the administrator can restore files'; end if;
    new.deleted_by := null;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger files_guard_trg before update on public.files
  for each row execute function public.files_guard();

-- ============ file_activity (user-facing) ============
create table public.file_activity (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_id uuid references public.files(id) on delete set null,
  event_type text not null check (event_type in
    ('UPLOADED','VIEWED','DOWNLOADED','DELETED','RESTORED')),
  created_at timestamptz not null default now(),
  safe_metadata jsonb not null default '{}'
);
create index file_activity_user_idx on public.file_activity (user_id, created_at desc);
create index file_activity_file_idx on public.file_activity (file_id, created_at desc);
create index file_activity_time_idx on public.file_activity (created_at desc, event_type);

create function public.files_activity_trg() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into file_activity (user_id, file_id, event_type, safe_metadata)
    values (new.uploaded_by, new.id, 'UPLOADED', jsonb_build_object('name', new.name, 'size', new.size_bytes));
  elsif new.deleted_at is not null and old.deleted_at is null then
    insert into file_activity (user_id, file_id, event_type, safe_metadata)
    values (auth.uid(), new.id, 'DELETED', jsonb_build_object('name', new.name));
  elsif new.deleted_at is null and old.deleted_at is not null then
    insert into file_activity (user_id, file_id, event_type, safe_metadata)
    values (auth.uid(), new.id, 'RESTORED', jsonb_build_object('name', new.name));
  end if;
  return new;
end $$;
create trigger files_activity_ins after insert on public.files
  for each row execute function public.files_activity_trg();
create trigger files_activity_upd after update on public.files
  for each row execute function public.files_activity_trg();

-- ============ audit_logs (security events, admin-read only) ============
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  target_type text,
  target_id text,
  status text not null default 'SUCCESS' check (status in ('SUCCESS','FAILURE')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_time_idx on public.audit_logs (created_at desc);
create index audit_type_idx on public.audit_logs (event_type, created_at desc);

create function public.log_audit(p_actor uuid, p_type text, p_target_type text, p_target text,
                                 p_status text default 'SUCCESS', p_meta jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into audit_logs (actor_user_id, event_type, target_type, target_id, status, metadata)
  values (p_actor, p_type, p_target_type, p_target, p_status, p_meta)
$$;

-- ============ presence ============
create table public.presence_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_key text not null,
  current_page text,
  current_file_id uuid references public.files(id) on delete set null,
  file_view_started_at timestamptz,
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (user_id, session_key)
);
create index presence_hb_idx on public.presence_sessions (last_heartbeat_at desc) where ended_at is null;

-- ============ RPCs (the only write path for sensitive data) ============
create function public.touch_login() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active() then return; end if;
  update profiles set last_login_at = now()
   where id = auth.uid() and (last_login_at is null or last_login_at < now() - interval '1 minute');
  if found then perform log_audit(auth.uid(), 'LOGIN_SUCCESS', 'user', auth.uid()::text); end if;
end $$;

create function public.record_file_event(p_file uuid, p_event text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_event not in ('VIEWED','DOWNLOADED') then raise exception 'Invalid event'; end if;
  if not public.is_active() or not exists (
    select 1 from files f where f.id = p_file and (f.deleted_at is null or public.is_admin())
  ) then raise exception 'Not authorized'; end if;
  insert into file_activity (user_id, file_id, event_type) values (auth.uid(), p_file, p_event);
end $$;

create function public.heartbeat(p_session text, p_page text default null, p_file uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_active() then raise exception 'Not authorized'; end if;
  if p_file is not null and not exists (
    select 1 from files where id = p_file and (deleted_at is null or public.is_admin())
  ) then p_file := null; end if;

  insert into presence_sessions (user_id, session_key, current_page, current_file_id, file_view_started_at)
  values (auth.uid(), left(p_session, 64), left(p_page, 200), p_file,
          case when p_file is null then null else now() end)
  on conflict (user_id, session_key) do update set
    last_heartbeat_at = now(), ended_at = null,
    current_page = excluded.current_page,
    file_view_started_at = case
      when excluded.current_file_id is null then null
      when excluded.current_file_id is distinct from presence_sessions.current_file_id then now()
      else presence_sessions.file_view_started_at end,
    current_file_id = excluded.current_file_id;
end $$;

create function public.end_session(p_session text) returns void
language sql security definer set search_path = public as $$
  update presence_sessions set ended_at = now(), current_file_id = null, file_view_started_at = null
  where user_id = auth.uid() and session_key = left(p_session, 64)
$$;

create function public.admin_set_role(p_target uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = public as $$
declare v_old public.app_role;
begin
  if not public.is_admin() then
    perform log_audit(auth.uid(), 'ACCESS_DENIED', 'user', p_target::text, 'FAILURE', '{"op":"set_role"}');
    raise exception 'Not authorized';
  end if;
  if p_role not in ('EDITOR','VIEWER') then raise exception 'Role must be EDITOR or VIEWER'; end if;
  select role into v_old from profiles where id = p_target for update;
  if not found then raise exception 'User not found'; end if;
  if v_old = 'ADMIN' then raise exception 'The administrator role cannot be changed'; end if;
  update profiles set role = p_role where id = p_target;
  perform log_audit(auth.uid(), 'ROLE_CHANGED', 'user', p_target::text, 'SUCCESS',
                    jsonb_build_object('from', v_old, 'to', p_role));
end $$;

create function public.admin_set_status(p_target uuid, p_status public.account_status) returns void
language plpgsql security definer set search_path = public as $$
declare v_role public.app_role;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select role into v_role from profiles where id = p_target for update;
  if not found then raise exception 'User not found'; end if;
  if v_role = 'ADMIN' then raise exception 'The administrator cannot be suspended'; end if;
  update profiles set status = p_status where id = p_target;
  perform log_audit(auth.uid(),
    case p_status when 'SUSPENDED' then 'USER_SUSPENDED' else 'USER_REACTIVATED' end,
    'user', p_target::text);
  if p_status = 'SUSPENDED' then
    update presence_sessions set ended_at = now(), current_file_id = null where user_id = p_target;
  end if;
end $$;

create function public.online_users(p_window_seconds int default 90)
returns table (user_id uuid, display_name text, email text, role public.app_role,
               last_heartbeat_at timestamptz, current_page text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return query
    select p.id, p.display_name, p.email, p.role, max(s.last_heartbeat_at),
           (array_agg(s.current_page order by s.last_heartbeat_at desc))[1]
    from presence_sessions s join profiles p on p.id = s.user_id
    where s.ended_at is null and p.status = 'ACTIVE'
      and s.last_heartbeat_at > now() - make_interval(secs => p_window_seconds)
    group by p.id, p.display_name, p.email, p.role;
end $$;

create function public.active_viewing(p_window_seconds int default 90)
returns table (user_id uuid, display_name text, role public.app_role, file_id uuid, file_name text,
               viewing_since timestamptz, last_heartbeat_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return query
    select p.id, p.display_name, p.role, f.id, f.name, s.file_view_started_at, s.last_heartbeat_at
    from presence_sessions s
    join profiles p on p.id = s.user_id join files f on f.id = s.current_file_id
    where s.ended_at is null and s.current_file_id is not null
      and s.last_heartbeat_at > now() - make_interval(secs => p_window_seconds);
end $$;

grant execute on function public.touch_login(), public.record_file_event(uuid, text),
  public.heartbeat(text, text, uuid), public.end_session(text),
  public.admin_set_role(uuid, public.app_role), public.admin_set_status(uuid, public.account_status),
  public.online_users(int), public.active_viewing(int) to authenticated;

-- ============ Directory view (names only, so editors/viewers can show uploaders) ============
create view public.directory as select id, display_name from public.profiles where status = 'ACTIVE';

-- ============ Table privileges ============
revoke all on public.profiles, public.files, public.file_activity, public.audit_logs,
  public.presence_sessions, public.directory from anon, authenticated;
grant select on public.profiles, public.files, public.file_activity, public.audit_logs,
  public.presence_sessions, public.directory to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert (name, description, storage_path, mime_type, size_bytes, category, tags, uploaded_by)
  on public.files to authenticated;
grant update (name, description, category, tags, deleted_at) on public.files to authenticated;
grant delete on public.files to authenticated;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.files enable row level security;
alter table public.file_activity enable row level security;
alter table public.audit_logs enable row level security;
alter table public.presence_sessions enable row level security;

create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy files_select on public.files for select to authenticated
  using (public.is_active() and (deleted_at is null or public.is_admin()));
create policy files_insert on public.files for insert to authenticated
  with check (public.can_write() and uploaded_by = auth.uid() and deleted_at is null);
create policy files_update on public.files for update to authenticated
  using (public.is_admin() or (public.can_write() and uploaded_by = auth.uid() and deleted_at is null))
  with check (public.is_admin() or (public.can_write() and uploaded_by = auth.uid()));
create policy files_delete on public.files for delete to authenticated
  using (public.is_admin() and deleted_at is not null);

create policy activity_select on public.file_activity for select to authenticated
  using (public.is_active() and (user_id = auth.uid() or public.is_admin()));
create policy audit_select on public.audit_logs for select to authenticated
  using (public.is_admin());
create policy presence_select on public.presence_sessions for select to authenticated
  using (public.is_admin());

-- ============ Storage: private bucket + policies ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('vault', 'vault', false, 26214400, array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain','text/csv','image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy vault_read on storage.objects for select to authenticated
  using (bucket_id = 'vault' and public.is_active() and exists (
    select 1 from public.files f where f.storage_path = storage.objects.name
      and (f.deleted_at is null or public.is_admin())));

create policy vault_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'vault' and public.can_write()
    and (storage.foldername(name))[1] = auth.uid()::text);

create policy vault_delete on storage.objects for delete to authenticated
  using (bucket_id = 'vault' and public.is_admin());
