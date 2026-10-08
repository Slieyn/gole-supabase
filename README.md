# GOLE Cloud Go-Live Launch — RSVP site (Supabase version)

Public event page (`index.html`) + protected admin dashboard (`admin.html`), backed by Supabase.

```
index.html        public landing page, invitation pop-up, RSVP form
admin.html        admin login + dashboard (cards, charts, table, edit, delete, CSV export)
css/ js/ assets/  styles, scripts, logo and beads
js/config.js      <-- YOUR Supabase URL + anon key go here
supabase/schema.sql                         database, security rules, indexes
supabase/functions/send-confirmation/       confirmation email (Resend)
supabase/.env.example                       email secrets (RESEND_API_KEY, FROM_EMAIL)
```

## 1. Create the Supabase project
1. Sign up at supabase.com → **New project** (remember the database password).
2. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**. This creates the `rsvps` table, unique-email rule, indexes, Row Level Security and the secure functions the page uses.
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key into `js/config.js`.
   Never put the `service_role` key in this project's front-end files.

## 2. Create your admin login
1. **Authentication → Users → Add user → Create new user**: enter your email + a strong password (tick *Auto Confirm*).
2. **Authentication → Providers → Email**: turn **off** "Allow new users to sign up" so no one else can create accounts.
3. **SQL Editor**, run (use your email):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
   ```
4. To add more admins later: create the user, then repeat step 3 with their email.

## 3. Run it locally in VS Code
Install Node.js (nodejs.org), open this folder in VS Code, then in the terminal:
```
npm run dev
```
Open http://localhost:3000 (public page) and http://localhost:3000/admin (dashboard, sign in with the user from step 2).
Alternative: install the VS Code **Live Server** extension, right-click `index.html` → *Open with Live Server*.

## 4. Confirmation emails (optional but recommended)
1. Create a free account at resend.com, verify your sending domain, create an API key.
2. `cp supabase/.env.example supabase/.env` and fill in `RESEND_API_KEY` and `FROM_EMAIL`.
3. Install the Supabase CLI (supabase.com/docs/guides/cli), then from this folder:
```
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase secrets set --env-file supabase/.env
supabase functions deploy send-confirmation
```
If the function isn't deployed, RSVPs still save; only the email is skipped.

## Environment variables
| Name | Where | Notes |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | `js/config.js` | public by design; protected by Row Level Security |
| `RESEND_API_KEY`, `FROM_EMAIL` | `supabase/.env` → `supabase secrets set` | server-side only, never in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | provided automatically inside the edge function | never put it in the front-end |

## How security works
- The public can't read or change the `rsvps` table directly (RLS, no public policies). They can only call `rsvp_exists` and `submit_rsvp`.
- Only users listed in `admins` can read, edit or delete RSVPs.
- Duplicate emails are impossible (unique index on `lower(email)`); a repeat submission offers "Update my RSVP".
- Known trade-off: anyone who knows an attendee's email can overwrite that RSVP (there are no attendee accounts) and can check whether an email is registered.

## Deploying
Upload the folder to any static host (Netlify, Vercel, Cloudflare Pages, Supabase-compatible). Add your site URL under Supabase **Authentication → URL Configuration**.
