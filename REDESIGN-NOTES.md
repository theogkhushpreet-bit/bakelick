# BAKELICK redesign notes

This package updates the existing static storefront and keeps the current Vercel API routes, Supabase helper, admin dashboard, and environment-variable names in place.

## Included
- Responsive BAKELICK storefront with a short skippable intro, menu, About section, cookie photo gallery, footer, cart, and checkout modal.
- Supplied cookie photos, original supplied BAKELICK logo artwork (cropped from the supplied logo image without redrawing the lettering), and the supplied PhonePe QR image. The QR asset is cropped around the printed QR to improve checkout scanning; the QR pattern itself was not redrawn.
- Product catalog aligned in the browser and server-side order pricing:
  - Chocolate Chip — ₹75
  - Biscoff Lava — ₹110
  - Mini Dippers (8 cookies with chocolate dip) — ₹250
- Existing payment proof upload and manual payment-verification behavior retained.

## Existing operational limits to verify before launch
- The existing order API currently accepts Ambala deliveries only and adds the configured Ambala delivery fee (default ₹45).
- Payment screenshots remain pending until an admin verifies receipt of funds. Uploading a screenshot does not mark an order as paid.
- This archive does not contain production environment secrets. Keep the existing Vercel environment variables configured in the Vercel project; do not add secrets to public files.
- Verify Supabase configuration, admin login, the actual QR's payment destination, order submission, and admin review on a preview deployment before promoting to production.

## Run locally
Install dependencies with `npm install`, then run `npm run dev` using the Vercel CLI. Configure the same environment variables already used by your deployed project. The storefront itself can also be previewed as static files, but order submission requires the Vercel API routes and Supabase configuration.
