-- ============ RLS Security Verification Tests ============
-- Replace placeholder UUIDs with actual test account UUIDs.
begin;
set local role authenticated;

-- VIEWER Tests
-- 1. Must fail to promote self
-- select set_config('request.jwt.claims', '{"sub":"<VIEWER_UUID>","role":"authenticated"}', true);
-- update public.profiles set role = 'ADMIN' where id = '<VIEWER_UUID>'; -- permission denied (column grant)

-- 2. Must fail to insert files
-- insert into public.files (name,storage_path,mime_type,size_bytes,uploaded_by)
--   values ('x','<VIEWER_UUID>/x.txt','text/plain',1,'<VIEWER_UUID>'); -- RLS violation

-- 3. Must fail to call admin_set_role
-- select public.admin_set_role('<VIEWER_UUID>', 'EDITOR'); -- Not authorized

-- 4. Must fail to read audit logs
-- select count(*) from public.audit_logs; -- 0 rows returned

-- EDITOR Tests
-- select set_config('request.jwt.claims', '{"sub":"<EDITOR_UUID>","role":"authenticated"}', true);
-- update public.files set deleted_at = now() where uploaded_by <> '<EDITOR_UUID>'; -- 0 rows affected

-- ADMIN Tests
-- select set_config('request.jwt.claims', '{"sub":"<ADMIN_UUID>","role":"authenticated"}', true);
-- select public.admin_set_role('<ADMIN_UUID>', 'VIEWER'); -- error: administrator role cannot be changed
-- select public.admin_set_role('<VIEWER_UUID>', 'ADMIN'); -- error: Role must be EDITOR or VIEWER

rollback;
