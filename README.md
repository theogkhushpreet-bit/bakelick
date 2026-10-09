# Bakelick Cookie Shop

A responsive cookie storefront with a cart, checkout, UPI QR payment instructions, payment-proof upload, manual verification and a private order dashboard.

## Before publishing

- The products and prices are sample values. Update them in **both** `public/shop.js` and `api/orders.js` before accepting real orders.
- `public/upi-qr.svg` is a placeholder, not a payment QR. Replace it with your real QR image named `upi-qr.png`, then update the QR `<img>` in `public/index.html` to `/upi-qr.png`. Never publish the placeholder as a payment destination.
- This first version accepts Ambala delivery only and adds the ₹45 delivery fee. Configure the fee with `AMBALA_DELIVERY_FEE` in the environment variables.
- Payment screenshots are proof submitted by customers, not proof of successful payment. Verify each transaction in your UPI app/bank account before setting the payment to Paid.
- Use a private admin password and do not share `/admin.html` login details.

## 1. Create the Supabase database

1. Create a project at https://supabase.com/.
2. Open **SQL Editor**, create a new query, paste the complete contents of `sql/setup.sql`, and run it.
3. Open **Project Settings → API** and copy the project URL and `service_role` key. The service-role key is secret: only use it in server environment variables, never in `public/` files.

## 2. Configure environment variables

Copy `.env.example` to `.env.local` for local development, or add these variables in Vercel → Project → Settings → Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SESSION_SECRET` — long random secret (32+ characters)
- `ADMIN_PASSWORD` — strong password for the private dashboard
- `AMBALA_DELIVERY_FEE` — optional, defaults to `45`

Use different secrets for development and production. Do not commit `.env.local` or paste keys into chat.

## 3. Run locally

Install Node.js 22, then in this directory run:

```bash
npm install
npm run dev
```

Open the local URL printed by Vercel. Storefront: `/`; admin: `/admin.html`.

## 4. Deploy free-tier version to Vercel

1. Upload this folder to a new GitHub repository (do not upload `.env.local`).
2. In Vercel, choose **Add New → Project**, import the repository and deploy.
3. Before accepting real orders, add all environment variables in Vercel Settings → Environment Variables and redeploy.
4. Open `/admin.html`, sign in with `ADMIN_PASSWORD`, and test a sample order.
5. Replace the QR placeholder with your real UPI QR image and test the payment instructions. Use the live URL on a phone.

Vercel's Node.js functions run from the `/api` directory. Supabase free usage has limits and projects may pause after inactivity; review the current plan limits before relying on it for ongoing business. This project is a starter, not a substitute for production security review.

## API endpoints

- `GET /api/login` — configuration status
- `POST /api/login` — admin sign-in
- `DELETE /api/login` — sign out
- `POST /api/orders` — submit a customer order and proof screenshot
- `GET /api/orders` — admin-only order list with short-lived proof image links
- `PATCH /api/orders` — admin-only payment/order status updates

## Change product prices

Update the product price/name list in both `public/shop.js` and `api/orders.js`. The server calculates prices independently; never rely on a price submitted by the customer's browser.
