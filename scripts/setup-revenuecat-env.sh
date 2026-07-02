#!/usr/bin/env bash
# Set RevenueCat public API key on EAS production for TradeKeepCRM.
# Usage: ./scripts/setup-revenuecat-env.sh appl_your_key_here

set -euo pipefail
cd "$(dirname "$0")/.."

KEY="${1:-}"
if [[ -z "$KEY" ]]; then
  echo "Usage: ./scripts/setup-revenuecat-env.sh appl_your_revenuecat_public_key"
  echo ""
  echo "Get the key from RevenueCat → Project → API keys → iOS public key"
  exit 1
fi

if [[ ! "$KEY" == appl_* ]]; then
  echo "Warning: iOS public keys usually start with appl_"
fi

echo "Setting EXPO_PUBLIC_REVENUECAT_API_KEY on EAS production..."
npx eas-cli env:create production \
  --name EXPO_PUBLIC_REVENUECAT_API_KEY \
  --value "$KEY" \
  --visibility sensitive \
  --force

echo ""
echo "Done. Rebuild for TestFlight:"
echo "  npx eas-cli build --platform ios --profile production"
