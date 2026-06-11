# The Ledger — personal finance, kept by hand

**Live demo: [the-ledgerbynar.netlify.app](https://the-ledgerbynar.netlify.app)**

A private, multi-currency personal finance organizer. No accounts, no servers — your data lives in your own browser, optionally encrypted.

Use it at the link above, or open `index.html` locally in any browser. (Internet is needed on first load for fonts, React, and Chart.js from CDNs.)

## What it does

- **Income & expenses per month** — each entry is stored in the currency you entered it in (֏, $, €, …) and is never converted away.
- **Wealth tab** — cash savings per currency plus **gold by weight and karat**, all totalled as your net worth.
- **Dual-currency display** — every total shows your primary currency (e.g. AMD) with the secondary equivalent (e.g. USD) underneath. Both are configurable in Settings.
- **Manual exchange rates & gold price** — update a rate in Settings and every total, chart, and conversion re-prices instantly. Original amounts never change.
- **Goals** — each goal lives in its own currency; contribute in any currency and it converts at your saved rate.
- **Budgeting** — allocation buckets, 50/30/20, zero-based, envelope.
- **Analytics** — category breakdowns, income vs. expenses, savings-rate insights.
- **Mobile friendly** — bottom tab bar and responsive layout on small screens.

## Keeping your data safe

- Everything is stored locally in your browser (`localStorage`). Nothing is uploaded anywhere.
- **App lock** (Settings → Security): set a passphrase and your data is encrypted at rest with AES-256-GCM (key derived via PBKDF2, 250k iterations). The app asks for the passphrase on open.
  - ⚠️ **There is no recovery.** Forget the passphrase and the data cannot be decrypted — keep backups.
- **Backups** (Settings → Your data):
  - *Export / Import JSON* — plain readable backup.
  - *Encrypted backup / Restore* — passphrase-protected file, safe to keep in cloud drives or email.
- Clearing browser site data deletes your ledger — export a backup first.

## Sharing with friends

Every person who opens the app gets **their own private ledger** — data is per-browser, never shared between users.

1. **Send the folder.** Zip this folder and send it. They open `index.html` — done.
2. **Host it free** (recommended):
   - **Netlify**: connect this GitHub repo (or drag the folder onto [Netlify Drop](https://app.netlify.com/drop)) and share the link.
   - **GitHub Pages**: enable Pages in the repo settings, serve from the root.
   - **Vercel**: `npx vercel` in this folder.

## File map

| File | Purpose |
|---|---|
| `index.html` | Entry point — loads React, Babel, Chart.js, then the app scripts |
| `styles.css` | Design tokens (light/dark) + full stylesheet |
| `lib.jsx` | Currencies, rates, gold math, crypto, UI primitives, charts, icons |
| `app.jsx` | Root state, persistence (plain or encrypted), v1→v2 migration, routing |
| `tab-*.jsx` | One file per tab: overview, income, expenses, wealth, goals, analytics, settings |

Data is stored under the `ledger.v2` key. Old `ledger.v1` saves migrate automatically — legacy amounts are tagged with the main currency they were stored in.

## Tech

No build step — React 18 (UMD) + Babel Standalone + Chart.js 4 from CDNs, vanilla CSS with design tokens, Web Crypto API for encryption. Open the HTML file and it runs.

## Roadmap ideas

- **Accounts & sync** — a small [Supabase](https://supabase.com) backend (auth + one `ledgers` table with row-level security) would give login, multi-device sync, and shared household budgets while keeping the same front-end. **See [SUPABASE.md](SUPABASE.md) for the full step-by-step plan.**
- **Live rates** — optional fetch from a free FX API with a "last updated" stamp, keeping manual override.
- **Recurring expenses** — auto-copy rent/subscriptions into each new month.
- **Net-worth history** — snapshot net worth monthly and chart the trend.
- **PWA** — a manifest + service worker would make it installable and fully offline.
