# Lifting the email rate limit (custom SMTP with Resend)

Supabase's built-in email sender is rate-limited to a handful of messages per hour — fine for testing, not for onboarding friends. The fix is to point Supabase at a real email provider. [Resend](https://resend.com) is the easiest: free tier is 3,000 emails/month (100/day), which covers a friends-and-family app comfortably.

## ⚠️ Read this first — you need a domain

Resend (like every real email service) will only send from a **domain you own and can verify via DNS**. Your app lives on `the-ledgerbynar.netlify.app`, which is a Netlify subdomain — you don't control its DNS, so you can't verify it with Resend.

So you have two honest paths:

- **Path A — get a cheap domain (recommended).** ~$10/year (Namecheap, Cloudflare, Porkbun). You'd want one eventually anyway — `the-ledger.netlify.app` reads as a hobby project, a real domain reads as a product. This unlocks Resend *and* a nicer URL.
- **Path B — skip email entirely with Google login.** "Continue with Google" needs no domain and no SMTP — one tap, no rate limit. Takes ~10 min of Google Cloud setup. If you don't want to buy a domain yet, this is the better move; tell me and I'll write that guide and wire the button.

The rest of this file assumes **Path A**.

## Step 1 — Resend account + domain (10 min)

1. Sign up at [resend.com](https://resend.com) (free, no card).
2. **Domains → Add Domain** → enter your domain (e.g. `getledger.app`).
3. Resend shows a few DNS records (SPF, DKIM, and usually a return-path). Add them in your domain registrar's DNS panel.
   - If your domain is on **Cloudflare**, Resend has a one-click integration that adds them for you.
4. Wait for verification to flip to **Verified** (minutes to an hour).

## Step 2 — Get SMTP credentials (2 min)

1. In Resend → **API Keys → Create API Key** (give it "Sending access"). Copy it — shown once.
2. Resend's SMTP settings are:
   - **Host:** `smtp.resend.com`
   - **Port:** `465` (SSL)
   - **Username:** `resend`
   - **Password:** *your API key from step 1*

## Step 3 — Point Supabase at Resend (3 min)

In your Supabase project → **Authentication → Emails → SMTP Settings** → enable **Custom SMTP** and fill in:

| Field | Value |
|---|---|
| Sender email | `login@yourdomain` (any address at your verified domain) |
| Sender name | `The Ledger` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key |

Save.

## Step 4 — Raise the rate limit (1 min)

**Authentication → Rate Limits** → increase **"Rate limit for sending emails"** from the default (a few per hour) to something like **30–100 per hour**. Now custom SMTP is doing the sending, so this is safe.

## Step 5 — Point the app at the new domain (when ready)

Once you have a custom domain, also:
1. In **Netlify → Domain settings**, add your domain so the app serves from it.
2. In **Supabase → Authentication → URL Configuration**, update the **Site URL** to your new domain (keep the `localhost` and `*--*.netlify.app` redirect entries for testing).
3. Update the live-demo link in `README.md`.

## Test

Sign-in card → send yourself a link. It should arrive from your own domain, instantly, with no rate-limit error. Check Resend's **Logs** tab to watch deliveries in real time.
