# MEDIA ON GAS - Automated Campaign Reporting

Automated campaign reports for MTN MoMo across Facebook, Instagram and TikTok.

**Two automated schedules:**

**DAILY (7am SAST, every day)** - Georgia internal email:
1. Pulls live data from Meta and TikTok APIs
2. Processes data (excludes POS, classifies campaigns, aggregates)
3. Claude generates flags, verdicts, and optimisation recommendations
4. Builds and sends the internal HTML email to Georgia

**WEEKLY (7am SAST, every Monday)** - Client report:
1. Same data pull and processing
2. Claude generates campaign reads and key insights
3. Builds and sends the full client HTML email

---

## Setup Guide (Step by Step)

### Step 1: Push to GitHub

Open GitHub Codespaces on your `media-on-gas` repo (or create a new repo called `media-on-gas-auto`):

```bash
# If using existing repo, create a new branch:
git checkout -b auto-reports

# Copy all files from this project into the repo
# Then:
git add .
git commit -m "Add automated daily reporting"
git push origin auto-reports
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New" > "Project"
3. Import your GitHub repo
4. Vercel will detect the `vercel.json` config automatically
5. Click "Deploy"

### Step 3: Add Environment Variables

In Vercel Dashboard > Your Project > Settings > Environment Variables, add each of these:

| Variable | Where to get it |
|----------|----------------|
| `META_ACCESS_TOKEN` | Meta Business Suite > System Users > Generate Token |
| `META_AD_ACCOUNT_ID` | Format: `act_123456789` from Ads Manager URL |
| `TIKTOK_ACCESS_TOKEN` | TikTok Business Center > Your approved app |
| `TIKTOK_ADVERTISER_ID` | TikTok Ads Manager > Account ID |
| `ANTHROPIC_API_KEY` | console.anthropic.com > API Keys |
| `GMAIL_CLIENT_ID` | Google Cloud Console > OAuth 2.0 |
| `GMAIL_CLIENT_SECRET` | Google Cloud Console > OAuth 2.0 |
| `GMAIL_REFRESH_TOKEN` | Generated via OAuth flow (see below) |
| `GMAIL_SENDER_EMAIL` | `grow@gasmarketing.co.za` |
| `CRON_SECRET` | Any random string you choose |
| `MOMO_META_BUDGET` | `100000` |
| `MOMO_TIKTOK_BUDGET` | `65000` |
| `MOMO_COMBINED_BUDGET` | `165000` |
| `MOMO_CLIENT_EMAIL` | `gary@gasmarketing.co.za` |
| `MOMO_INTERNAL_EMAIL` | `georgia@gasmarketing.co.za` |
| `MOMO_MONTH_START` | `2026-04-01` (update monthly) |
| `MOMO_MONTH_END` | `2026-04-30` (update monthly) |

### Step 4: Test API Connections

After deploying, test each API:

- **Meta:** Visit `https://your-app.vercel.app/api/test-meta`
- **TikTok:** Visit `https://your-app.vercel.app/api/test-tiktok`

Both should return `"success": true`.

### Step 5: Test a Full Report (Draft Mode)

Test the daily internal email:
```
https://your-app.vercel.app/api/daily-internal
```

Test the weekly client email:
```
https://your-app.vercel.app/api/weekly-client
```

Both will create Gmail drafts (not send) while SEND_MODE=draft. Check your Gmail drafts.

### Step 6: Go Live

Once drafts look good:
1. Change `SEND_MODE` to `send` in Vercel Environment Variables
2. The daily internal runs every morning at 7am SAST
3. The weekly client report runs every Monday at 7am SAST

---

## Gmail OAuth Setup

To send emails via Gmail API, you need a Google Cloud OAuth refresh token:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or use existing)
3. Enable the **Gmail API**
4. Go to Credentials > Create OAuth 2.0 Client ID
5. Application type: "Web application"
6. Add redirect URI: `https://developers.google.com/oauthplayground`
7. Note your Client ID and Client Secret
8. Go to [OAuth Playground](https://developers.google.com/oauthplayground)
9. Click the gear icon > Check "Use your own OAuth credentials"
10. Enter your Client ID and Secret
11. In Step 1, select `https://www.googleapis.com/auth/gmail.send`
12. Authorise with your `grow@gasmarketing.co.za` account
13. In Step 2, click "Exchange authorization code for tokens"
14. Copy the **Refresh Token** - this is your `GMAIL_REFRESH_TOKEN`

---

## File Structure

```
media-on-gas-auto/
  api/
    daily-internal.js  # Daily cron: Georgia internal with flags + optimisations
    weekly-client.js   # Weekly Monday cron: client campaign report
    test-meta.js       # Test Meta API connection
    test-tiktok.js     # Test TikTok API connection
  lib/
    pull-data.js       # Shared data pull (used by both routes)
    meta.js            # Meta Graph API data pull
    tiktok.js          # TikTok Business API data pull
    process.js         # Data processing (POS exclusion, KPI mapping)
    claude.js          # Claude API narrative generation
    email-builder.js   # HTML email template builder
    gmail.js           # Gmail API sender
  vercel.json          # Cron schedules + function config
  package.json         # Dependencies
  .env.example         # Environment variable template
```

---

## Monthly Update Checklist

At the start of each month:
1. Update `MOMO_MONTH_START` to `2026-05-01` (etc.)
2. Update `MOMO_MONTH_END` to `2026-05-31`
3. Refresh Meta token if using short-lived token (expires every 60 days)
4. Check TikTok token hasn't expired

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Meta token expired | Generate new token in Graph API Explorer or Business Manager |
| TikTok 401 error | Re-generate access token via OAuth flow |
| Gmail send fails | Check refresh token is valid, re-do OAuth Playground flow |
| Cron not running | Vercel free tier allows 1 cron. Check Vercel dashboard > Crons |
| Timeout error | Function needs to complete in 10s (free) or 60s (Pro). Consider upgrading to Pro |
