-- Run this quick grant in Supabase SQL Editor:
grant insert, update, select, delete on public.files to authenticated;
grant usage, select on all sequences in schema public to authenticated;
