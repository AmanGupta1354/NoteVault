-- ============ Admin Bootstrap: operator-only ============
-- Run this in the Supabase SQL editor after creating the initial user in Auth.
create or replace function public.bootstrap_admin(p_email text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from profiles where role = 'ADMIN') then
    raise exception 'An administrator already exists';
  end if;
  update profiles set role = 'ADMIN', status = 'ACTIVE' where lower(email) = lower(p_email);
  if not found then raise exception 'No such user: %', p_email; end if;
  perform log_audit(null, 'ADMIN_BOOTSTRAPPED', 'user', p_email);
end $$;

-- Usage:
-- select public.bootstrap_admin('you@example.com');
