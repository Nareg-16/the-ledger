# Adding accounts & sync with Supabase

A step-by-step plan for turning The Ledger into a multi-user app with login, cross-device sync, and (later) shared budgets — while **keeping the exact same front-end and still deploying it on Netlify**.

> **Status: the app code is DONE** (branch `supabase-sync`): `sync.js`, `supabase-config.js`, and an Account & sync card in Settings. What's left is the dashboard setup below — about 15 minutes, no code.

## ✅ Your setup checklist

1. **Create the project** — [supabase.com](https://supabase.com) → New project. Name: `the-ledger`, region: `eu-central-1` (closest to Armenia), set a database password (save it somewhere, you rarely need it).
2. **Create the table + security rules** — left sidebar → **SQL Editor** → New query → paste the SQL block from *Step 2* below → **Run**. It should say "Success. No rows returned."
3. **Allow logins from your site** — left sidebar → **Authentication → URL Configuration**:
   - Site URL: `https://the-ledgerbynar.netlify.app`
   - Additional Redirect URLs: add `http://localhost:8742` (so login also works when testing locally)
4. **Check email login is on** — **Authentication → Sign In / Providers**: "Email" should already be enabled by default. That's all the app needs (it uses passwordless magic links). Google login is optional and can be added any time later.
5. **Copy your two keys** — **Project Settings → API**: copy the **Project URL** and the **anon public** key, and paste them into [supabase-config.js](supabase-config.js). Then commit and push (or paste them in the chat and Claude will wire them in).

That's it. Once the keys are in and the branch is deployed, a new "Account & sync" card appears at the top of Settings.

---

The sections below are the original plan, kept as reference for how it works.

## Why Supabase fits this app

Supabase is a hosted Postgres database + authentication + auto-generated API. The Ledger's entire state is already one JSON object, so the backend can be literally **one table with one row per user**. No server code to write or maintain — the browser talks to Supabase directly, and the static files keep living on Netlify.

```
[Netlify: static files]  <— user's browser —>  [Supabase: auth + Postgres]
```

## Step 1 — Create the project (5 min)

1. Sign up at [supabase.com](https://supabase.com) (free, no card).
2. New project → pick a region close to your users (e.g. `eu-central-1` for Armenia).
3. From **Project Settings → API**, copy the `Project URL` and the `anon` public key. These two strings are safe to ship in the front-end — security comes from row-level security below, not from hiding keys.

## Step 2 — One table + row-level security (5 min)

Run this in the Supabase **SQL Editor**:

```sql
create table ledgers (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table ledgers enable row level security;

create policy "Users read own ledger"
  on ledgers for select using (auth.uid() = user_id);

create policy "Users insert own ledger"
  on ledgers for insert with check (auth.uid() = user_id);

create policy "Users update own ledger"
  on ledgers for update using (auth.uid() = user_id);
```

Row-level security (RLS) is the whole security model: even though the `anon` key is public, the database itself refuses to return or modify any row that doesn't belong to the logged-in user.

## Step 3 — Auth (10 min)

In **Authentication → Providers** enable:
- **Email** with magic links (no passwords to manage), and/or
- **Google** OAuth (nicest for sharing with friends — one tap, no signup form).

## Step 4 — Wire it into the app (~the real work, a few hours)

1. Add the client to `index.html`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ```
2. Create `sync.js` with the client and three functions:
   ```js
   const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   // signIn(email) -> magic link; onAuth(cb);
   // pull(): select data from ledgers where user_id = session.user.id
   // push(state): upsert { user_id, data: state, updated_at: new Date() }
   ```
3. In `app.jsx`:
   - On login: `pull()` — if the cloud copy is newer than local, use it; otherwise push local.
   - In the existing persist `useEffect` (already debounced): also call `push(state)` when logged in. localStorage stays as the offline cache, so the app keeps working with no internet and for users who never log in.
   - Add a small account card in Settings: signed-in email, sign in / sign out.
4. Conflict strategy: last-write-wins on `updated_at` is fine for a single person on two devices.

**Privacy bonus:** if the user has the app lock on, push the *encrypted* payload instead of plain state. Then Supabase only ever stores ciphertext — even you (the project owner) can't read anyone's finances.

## Step 5 — Shared budgets (later)

When you want households/friends sharing one budget:

```sql
create table shared_ledgers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
create table ledger_members (
  ledger_id uuid references shared_ledgers (id) on delete cascade,
  user_id   uuid references auth.users (id) on delete cascade,
  role      text not null default 'editor',   -- 'owner' | 'editor' | 'viewer'
  primary key (ledger_id, user_id)
);
```
RLS policies check membership via `ledger_members`. Supabase **Realtime** (websocket on table changes) makes edits appear live on everyone's screen.

## Admin controls

Supabase's own dashboard already gives you: user list, ban/delete users, browse/edit data, SQL console, logs. For a custom in-app admin page, add an `is_admin` flag in a `profiles` table and policies like `using (is_admin(auth.uid()))` — but for a personal project, the dashboard is usually all the "admin panel" you need.

## Costs

| | Free tier | Paid |
|---|---|---|
| **Supabase** | 2 projects, 500 MB database, 50,000 monthly active users, 5 GB bandwidth. Plenty for you + friends, forever. | Pro $25/mo (8 GB DB, daily backups, no pausing) |
| Caveat | Free projects **pause after ~1 week with zero traffic** — you just click "restore" in the dashboard. | Pro never pauses |

The Ledger's data is tiny (a few KB per user), so the free tier realistically covers hundreds of users.
