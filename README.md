# Watchtower — TikTok Link Monitor

Tracks TikTok video links for 7 days, sends a Telegram alert the moment a
video is detected removed, then re-checks every 3 hours until you swap in a
replacement link.

## How it actually works (read this first)

- A Vercel Cron job hits `/api/check` automatically. **On the free (Hobby)
  plan, Vercel Cron's minimum frequency is once per day** — this app is
  configured for a daily run (`vercel.json`). To get true 3-hour automated
  checks, upgrade to Vercel Pro ($20/mo) and change the cron schedule (see
  below) — no other code changes needed.
- TikTok actively blocks bot/server traffic with CAPTCHAs. The checker is
  written defensively: if it can't confirm the page's real content, it
  reports "uncertain" rather than guessing removed/live. You may see some
  videos sit in "Uncertain" status — that's TikTok blocking the request, not
  a bug. The "Check all now" button on the dashboard lets you manually
  trigger a check anytime.
- Storage is Vercel Blob (a simple JSON file). No separate database needed.

## Setup

### 1. Install dependencies and deploy

This project is ready to deploy as-is. Push it to a Git repo and import it
into Vercel, or deploy directly.

### 2. Enable Vercel Blob storage

In your Vercel project dashboard → Storage → Create a Blob store, and
connect it to this project. This automatically sets the
`BLOB_READ_WRITE_TOKEN` environment variable — no manual config needed.

### 3. Create a Telegram bot and get your chat ID

1. Open Telegram, message **@BotFather**, send `/newbot`, follow the
   prompts. You'll get a **bot token** (looks like
   `123456789:ABCdefGhIJKlmNoPQRsTUVwxyz`).
2. Decide who should receive alerts (e.g. the salesperson). Have that person
   open a chat with your new bot and send it any message (e.g. "hi") — this
   is required once so the bot is allowed to message them.
3. Get the chat ID: visit
   `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` in a browser
   right after step 2. Look for `"chat":{"id": ...}` in the JSON response —
   that number is the chat ID.
   - For a group chat instead, add the bot to the group, send a message in
     the group, and use the same `getUpdates` trick — group IDs are usually
     negative numbers.

### 4. Set environment variables in Vercel

Project Settings → Environment Variables:

| Variable | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | the token from BotFather |
| `TELEGRAM_CHAT_ID` | the chat ID from step 3 |
| `CRON_SECRET` | any random string you generate (e.g. `openssl rand -hex 16`) — secures the cron endpoint |

Redeploy after adding these so they take effect.

### 5. (Optional) Secure the cron endpoint

`vercel.json`'s cron jobs are automatically authenticated by Vercel using a
`Bearer` token equal to `CRON_SECRET` if you set one — this stops outsiders
from hitting your `/api/check` URL directly and spamming checks. If you skip
setting `CRON_SECRET`, the endpoint is open to anyone with the URL (low
risk, but worth knowing).

## Upgrading to true 3-hour checks (Vercel Pro)

Once you're on Pro, edit `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/check", "schedule": "0 */3 * * *" }
  ]
}
```

Redeploy. That's it — the app's internal 3-hour follow-up logic was already
written for this; only the cron *trigger* frequency was capped by the
Hobby plan.

## Using the dashboard

- **Track video**: paste a TikTok URL, optionally label it (e.g. a client
  name), click "Track video." It's now in its 7-day window.
- **Check all now**: manually triggers a check across all videos — useful
  for testing or getting an immediate read without waiting for the cron.
- When a video is detected removed: you get a Telegram message immediately
  (on the next cron run), and the card switches to a red pulsing ring,
  re-checking every 3 hours.
- **Add replacement link**: appears on removed videos. Adding one stops the
  3-hour cadence for the old link and starts a fresh 7-day window for the
  new one.
- **Stop tracking**: removes a video from the dashboard entirely.

## Local development

```bash
npm install
npm run dev
```

You'll need `BLOB_READ_WRITE_TOKEN` locally too (pull it with
`vercel env pull` after linking the project) to test storage, and the
Telegram env vars to test notifications.
