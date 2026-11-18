#!/usr/bin/env bash
# The server (supabase/functions/register) uses the SAME price rules as the app.
# Run this after changing packages/shared/src/pricing.ts, then redeploy the "register" function.
# (A test in packages/shared fails if the two copies differ.)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
{ echo "// COPY of packages/shared/src/pricing.ts — do not edit here; run scripts/sync-pricing.sh"; cat "$ROOT/packages/shared/src/pricing.ts"; } > "$ROOT/supabase/functions/register/pricing.ts"
echo "✓ pricing copied to supabase/functions/register/pricing.ts"
