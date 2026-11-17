#!/usr/bin/env bash
# Builds and uploads both websites to Vercel (account: the one `npx vercel whoami` shows).
#   App (parent & coach):  https://lg-complex-app.vercel.app   (Vercel project: lg-complex-app)
#   Admin dashboard:       https://lg-complex-admin.vercel.app (Vercel project: lg-complex-admin, root apps/admin)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "▶ App website"
cd "$ROOT/apps/mobile"
npx expo export -p web
SITE="$(mktemp -d)"
mkdir -p "$SITE/public"
cp -R dist/. "$SITE/public/"
rm -rf "$SITE/public/.vercel" "$SITE/public/vercel.json"
printf '{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }\n' > "$SITE/vercel.json"
(cd "$SITE" && npx vercel@latest link --yes --project lg-complex-app >/dev/null && npx vercel@latest deploy --prod --yes)

echo "▶ Admin dashboard"
cd "$ROOT"
npx vercel@latest link --yes --project lg-complex-admin >/dev/null
npx vercel@latest pull --yes --environment=production
npx vercel@latest build --prod
npx vercel@latest deploy --prebuilt --prod --yes

echo "✓ Done"
