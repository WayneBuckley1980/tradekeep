# RevenueCat setup — TradeKeepCRM

Use these **exact values** when configuring [RevenueCat](https://app.revenuecat.com).

## Your app identifiers

| Setting | Value |
|---------|--------|
| App name | TradeKeepCRM |
| Bundle ID | `com.tradekeep.app` |
| Entitlement ID | `pro` |
| Monthly product ID | `tradekeep_pro_monthly` |
| Annual product ID | `tradekeep_pro_annually` |

---

## Step 1 — Create RevenueCat project

1. Sign in at [app.revenuecat.com](https://app.revenuecat.com)
2. **+ New Project** → name: `TradeKeepCRM`

---

## Step 2 — Add iOS app

1. **Project → TradeKeepCRM → + New → App**
2. **Apple App Store**
3. **App name:** TradeKeepCRM
4. **Bundle ID:** `com.tradekeep.app`
5. **App Store Connect App-Specific Shared Secret** OR **App Store Connect API** (recommended):
   - App Store Connect → **Users and Access → Integrations → App Store Connect API**
   - Create key with **Admin** or **App Manager** + access to your app
   - Download `.p8`, note **Issuer ID** and **Key ID**
   - Paste into RevenueCat when prompted

Without this link, RevenueCat cannot read your subscription products from Apple.

---

## Step 3 — Products

1. **Product catalog → Products → + New**
2. Add both (RevenueCat may auto-import after Step 2):

| Product ID | Type |
|------------|------|
| `tradekeep_pro_monthly` | Subscription |
| `tradekeep_pro_annually` | Subscription |

If import fails, products must be **Ready to Submit** in App Store Connect first.

---

## Step 4 — Entitlement

1. **Product catalog → Entitlements → + New**
2. **Identifier:** `pro` (must match `lib/purchases.ts`)
3. Attach both products to **`pro`**

---

## Step 5 — Offering (paywall)

1. **Product catalog → Offerings**
2. Edit **default** (or create **default** and set as **Current**)
3. Add packages:

| Package | Product |
|---------|---------|
| **Monthly** (`$rc_monthly`) | `tradekeep_pro_monthly` |
| **Annual** (`$rc_annual`) | `tradekeep_pro_annually` |

4. **Save** and ensure this offering is **Current**

The app loads `offerings.current` and uses `.monthly` / `.annual` packages.

---

## Step 6 — Copy iOS public API key

1. **Project → TradeKeepCRM → API keys**
2. Copy **Public app-specific API key** for iOS (starts with `appl_`)

### Set on EAS (required for TestFlight/production)

From `~/Projects/TradeKeep`:

```bash
npx eas-cli env:create production \
  --name EXPO_PUBLIC_REVENUECAT_API_KEY \
  --value "appl_PASTE_YOUR_KEY_HERE" \
  --visibility sensitive
```

Then rebuild TestFlight:

```bash
npx eas-cli build --platform ios --profile production
```

### Local dev (optional)

Add to `.env`:

```
EXPO_PUBLIC_REVENUECAT_API_KEY=appl_your_key_here
```

---

## Step 7 — Webhook (optional but recommended)

Syncs Pro status to Supabase when subscriptions renew/expire.

1. RevenueCat → **Project → Integrations → Webhooks → + New**
2. **URL:**
   ```
   https://xikwanxhrndjlpkoljpn.supabase.co/functions/v1/revenuecat-webhook
   ```
3. Generate an **Authorization header** value (any long random secret)
4. Set Supabase secrets and deploy:

```bash
supabase secrets set REVENUECAT_WEBHOOK_SECRET=your_random_secret
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase functions deploy revenuecat-webhook --project-ref xikwanxhrndjlpkoljpn
```

5. In RevenueCat webhook, set header: `Authorization: Bearer your_random_secret`

Events handled: purchase, renewal, cancellation, expiration → updates `profiles.subscription_tier`.

---

## Step 8 — Test

1. App Store Connect → **Sandbox** tester account
2. Device: **Settings → App Store → Sandbox Account**
3. TestFlight build **with** `EXPO_PUBLIC_REVENUECAT_API_KEY` set
4. **More → Upgrade to Pro** — prices should appear
5. Purchase with sandbox account
6. Confirm **More** shows **Pro** and 11th client can be added

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “Subscriptions unavailable” in app | EAS missing `EXPO_PUBLIC_REVENUECAT_API_KEY` or new build needed |
| No prices on paywall | RevenueCat not linked to App Store Connect API / products not imported |
| Annual missing | Offering annual package must use `tradekeep_pro_annually` |
| Purchase works but not Pro in app | Check entitlement ID is exactly `pro`; try Restore purchases |

---

## Already in the app (no code changes needed)

- `react-native-purchases` SDK
- Paywall at `/paywall` — £6.99/mo, £49/yr
- Free tier: 10 clients
- Restore purchases in **More**
- Login links RevenueCat user ID to Supabase user ID
