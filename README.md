# TradeKeepCRM

iOS CRM for solo tradespersons — barbers, cleaners, handymen, and more.

**Tagline:** Keep what your clients like. Know when to chase them.

## Features

- Client name, notes, last appointment, amount paid
- Follow-up reminders (1 week before + on the day)
- Free tier: 10 clients
- Pro: unlimited clients via Apple IAP (£6.99/mo or £49/yr)

## Setup

### 1. Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `EXPO_PUBLIC_REVENUECAT_API_KEY` | RevenueCat iOS public SDK key |

### 2. Supabase

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_initial.sql` via the SQL editor
3. Enable **Apple** and **Email (magic link)** auth providers
4. Add redirect URL: `tradekeep://auth/callback`

Deploy the RevenueCat webhook:

```bash
supabase functions deploy revenuecat-webhook
```

Set secrets: `REVENUECAT_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`

### 3. RevenueCat & App Store

1. Create App Store Connect app (iPhone, iPad, Mac Designed for iPad)
2. Products: `tradekeep_pro_monthly`, `tradekeep_pro_annual`
3. RevenueCat entitlement: `pro`
4. Point webhook to your Supabase edge function

### 4. Run locally

```bash
npm install
npm run ios
```

### 5. TestFlight build

```bash
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios
```

Configure `eas.json` and replace `extra.eas.projectId` in `app.json` after `eas init`.

## Regenerate assets

```bash
node scripts/generate-assets.mjs
```

Generates the pure-black app icon and graphite splash with **TradeKeepCRM** wordmark.

## Privacy & support

- Support: [docs/index.html](docs/index.html) → deploy via [docs/DEPLOY.md](docs/DEPLOY.md)
- Privacy policy: [docs/privacy.html](docs/privacy.html)

After GitHub Pages deploy:

- **Support URL:** `https://waynebuckley1980.github.io/tradekeep/`
- **Privacy URL:** `https://waynebuckley1980.github.io/tradekeep/privacy.html`

See [docs/PRIVACY.md](docs/PRIVACY.md) for the markdown source.
