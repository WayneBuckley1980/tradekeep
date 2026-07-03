# TradeKeepCRM — App Store Connect screenshots

Ready-to-upload PNG screenshots for iOS App Store distribution. Generated with `node scripts/generate-app-store-screenshots.mjs` using the app theme (`#2A2A2A` background, dark CRM styling).

## Dimensions

| Device slot in App Store Connect | Folder | Size (portrait) |
|----------------------------------|--------|-----------------|
| **6.5" Display** (iPhone 11 Pro Max, XS Max, etc.) | `iphone/` | **1284 × 2778** px |
| **13" Display** (iPad Pro 12.9" / 13") | `ipad/` | **2048 × 2732** px |

Upload screenshots in the order below — App Store Connect shows them left-to-right in the order you add them.

## iPhone (`iphone/`)

| File | Feature | Headline |
|------|---------|----------|
| `01-home-client-list.png` | Home — client list, search, business type | Manage every client in one place |
| `02-client-workspace.png` | Client workspace — workflow tabs (quote → closed) | Track every job from quote to close |
| `03-create-quote.png` | New quote — line items and total | Build quotes with line items in seconds |
| `04-invoices-money.png` | Money tab — overview stats and invoices | Stay on top of invoices and cash flow |
| `05-leads-convert.png` | Leads tab — convert to client | Turn enquiries into loyal clients |
| `06-settings-business-type.png` | More — business type and profile | Built for trades, walkers, trainers and more |

## iPad (`ipad/`)

Same six screens as iPhone, scaled for the 13" iPad slot:

| File | Feature |
|------|---------|
| `01-home-client-list.png` | Home / client list |
| `02-client-workspace.png` | Client workspace workflow |
| `03-create-quote.png` | Create quote / line items |
| `04-invoices-money.png` | Invoices & money |
| `05-leads-convert.png` | Leads → convert to client |
| `06-settings-business-type.png` | Settings / business type |

## How to upload in App Store Connect

1. Sign in to [App Store Connect](https://appstoreconnect.apple.com).
2. Open **My Apps** → **TradeKeepCRM** → your app version (e.g. **1.0.0**).
3. Go to **App Store** → **iOS App** (or the localised listing you are editing).
4. Scroll to **Previews and Screenshots**.
5. Select the device size tab:
   - **6.5" Display** — drag all six files from `iphone/` (or use **+** and browse). Order: `01` through `06`.
   - **13" Display** — drag all six files from `ipad/` in the same order.
6. Save the version, then submit for review when the rest of the listing is complete.

**Tip:** If Connect asks for other sizes (6.7", 6.1", 11" iPad), you can often reuse these assets — Apple may scale them, or you can re-run the generator script with different dimensions if needed.

## Regenerate

```bash
node scripts/generate-app-store-screenshots.mjs
```
