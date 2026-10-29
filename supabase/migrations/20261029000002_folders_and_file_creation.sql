-- ============ Migration 20261029000002_folders_and_file_creation.sql ============

-- 1. Add folder_id and is_folder columns to files table
alter table public.files 
  add column if not exists is_folder boolean not null default false,
  add column if not exists parent_id uuid references public.files(id) on delete cascade;

-- Allow size_bytes to be 0 for folders (previously had check size_bytes > 0)
alter table public.files drop constraint if exists files_size_bytes_check;
alter table public.files add constraint files_size_bytes_check 
  check (size_bytes >= 0 and size_bytes <= 26214400);

-- Make storage_path unique only among non-folders or provide a virtual path format
-- To keep storage_path not null and unique, folders use format: folder/<uploader_id>/<folder_uuid>

create index if not exists files_parent_idx on public.files (parent_id) where deleted_at is null;
create index if not exists files_is_folder_idx on public.files (is_folder);

-- 2. Grant permissions on new columns
grant insert (name, description, storage_path, mime_type, size_bytes, category, tags, uploaded_by, is_folder, parent_id)
  on public.files to authenticated;
grant update (name, description, category, tags, deleted_at, parent_id) on public.files to authenticated;

-- 3. In-app note / text file creation RPC
create or replace function public.create_document(
  p_name text,
  p_content text,
  p_category text default 'General',
  p_parent_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_file_id uuid := gen_random_uuid();
  v_path text;
  v_size bigint;
begin
  if not public.can_write() then raise exception 'Not authorized to create documents'; end if;
  if p_name is null or length(trim(p_name)) = 0 then raise exception 'Document name cannot be empty'; end if;

  v_path := auth.uid()::text || '/' || v_file_id::text || '-' || regexp_replace(p_name, '[^a-zA-Z0-9._-]', '_', 'g');
  if not (v_path like '%.txt' or v_path like '%.md') then
    v_path := v_path || '.txt';
  end if;
  
  v_size := octet_length(coalesce(p_content, ''));

  insert into public.files (
    id, name, description, storage_path, mime_type, size_bytes, category, uploaded_by, is_folder, parent_id
  ) values (
    v_file_id,
    case when p_name like '%.txt' or p_name like '%.md' then p_name else p_name || '.txt' end,
    'Created in NoteVault',
    v_path,
    'text/plain',
    v_size,
    coalesce(p_category, 'General'),
    auth.uid(),
    false,
    p_parent_id
  );

  return v_file_id;
end $$;

-- 4. Create Folder RPC
create or replace function public.create_folder(
  p_name text,
  p_category text default 'General',
  p_parent_id uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_folder_id uuid := gen_random_uuid();
  v_path text;
begin
  if not public.can_write() then raise exception 'Not authorized to create folders'; end if;
  if p_name is null or length(trim(p_name)) = 0 then raise exception 'Folder name cannot be empty'; end if;

  v_path := 'folder/' || auth.uid()::text || '/' || v_folder_id::text;

  insert into public.files (
    id, name, description, storage_path, mime_type, size_bytes, category, uploaded_by, is_folder, parent_id
  ) values (
    v_folder_id,
    trim(p_name),
    'Folder container',
    v_path,
    'application/vnd.notevault.folder',
    0,
    coalesce(p_category, 'General'),
    auth.uid(),
    true,
    p_parent_id
  );

  return v_folder_id;
end $$;

grant execute on function public.create_document(text, text, text, uuid), public.create_folder(text, text, uuid) to authenticated;
