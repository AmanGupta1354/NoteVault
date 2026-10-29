# NoteVault 🛡️
### Secure Role-Based File & Document Management Platform

NoteVault is a centralized enterprise document and knowledge management system built with **React (JavaScript/JSX)**, **Vite**, **Tailwind CSS**, **TanStack Query**, **Recharts**, **Lucide Icons**, and **Supabase (PostgreSQL with Row-Level Security, Storage, & Realtime Presence)**.

---

## 🏛️ System Architecture & Access Model

NoteVault enforces a strict 3-tier permission model backed by PostgreSQL Row-Level Security (RLS) and cryptographic storage access policies:

| Access Role | Privileges & Boundaries |
| :--- | :--- |
| **ADMIN** | Exactly **ONE** administrator allowed in the entire system. Can promote Viewers to Editors, demote Editors to Viewers, suspend/reactivate users, inspect platform analytics, view live user presence & active file viewing sessions, monitor security audit logs, access the trash recovery quarantine, and permanently purge or restore documents. |
| **EDITOR** | Can upload documents up to 25MB, add file metadata/tags/categories, preview and download shared files, view personal uploads and activity, and soft-delete files they uploaded. *Cannot access administrative telemetry, change user roles, or promote anyone to admin.* |
| **VIEWER** | Default role assigned to newly registered users. Can browse the shared library, search, preview supported documents (PDF, Images, CSV, Text), download files, and inspect personal history. *Cannot upload, modify, or delete files.* |

---

## 🔒 Single-Administrator Enforcement

The single-admin invariant is enforced at the database level:
```sql
CREATE UNIQUE INDEX one_admin_only ON public.profiles ((role)) WHERE role = 'ADMIN';
```

- **Database Protection Trigger**: `profiles_guard_trg` blocks any client-initiated attempt to demote, suspend, or delete the administrator account.
- **Server-Side RPC**: `admin_set_role(target, role)` only permits setting `EDITOR` or `VIEWER`. It is physically impossible to promote a second user to `ADMIN` through the application UI or API calls.
- **Operator-Only Recovery**: If the administrator account must ever be replaced, an authorized operator must execute the bypass SQL directly inside the Supabase SQL Editor:
  ```sql
  BEGIN;
  SET LOCAL notevault.allow_admin_change = 'on';
  UPDATE public.profiles SET role = 'VIEWER' WHERE role = 'ADMIN';
  UPDATE public.profiles SET role = 'ADMIN', status = 'ACTIVE' WHERE email = 'new-admin@domain.com';
  COMMIT;
  ```

---

## 🚀 Setup & Local Development

### 1. Prerequisites
- Node.js (v18+)
- A Supabase project (free or pro)

### 2. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
```
Fill in your public Supabase project credentials in `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Database Migration
Open your Supabase Project Dashboard -> **SQL Editor**, and execute the migration file:
`supabase/migrations/20261029000001_core.sql`

This creates:
- `public.profiles` with single-admin unique index and new-user trigger.
- Helper functions: `current_app_role()`, `is_active()`, `is_admin()`, `can_write()`.
- `public.files` with soft-deletion tracking and metadata indexes.
- `public.file_activity` and `public.audit_logs`.
- `public.presence_sessions` with periodic heartbeat RPCs.
- RPC functions: `touch_login`, `heartbeat`, `end_session`, `admin_set_role`, `admin_set_status`, `online_users`, `active_viewing`.
- Storage bucket `vault` with signed-URL authorization policies.

### 4. Initial Administrator Bootstrap
1. In the Supabase Dashboard -> **Authentication** -> **Users**, invite or register your administrator user.
2. Open the **SQL Editor** and run `supabase/bootstrap_admin.sql`:
   ```sql
   SELECT public.bootstrap_admin('your-admin-email@domain.com');
   ```

### 5. Start Application
```bash
npm install
npm run dev
```

---

## 📦 Production Deployment

### Deploying to Vercel
1. Push your repository to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Add the Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. The project includes `vercel.json` to handle client-side routing rewrites for React Router.
5. Deploy!

---

## 🧪 Security & Verification Testing

Test the security boundaries in the Supabase SQL editor using `supabase/tests/rls.sql`:
1. **Viewer Isolation**: Ensure Viewers cannot insert files or alter profile roles.
2. **Editor Ownership**: Ensure Editors cannot delete files uploaded by other members.
3. **Single Admin Guarantee**: Ensure calling `admin_set_role` with `'ADMIN'` throws an error.
4. **Storage URL Protection**: Files in the `vault` bucket require short-lived signed URLs generated only for authorized sessions. Guessing paths is blocked by storage policies.
