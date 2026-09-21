# Smart E-Fining System

**Continuous Overspeed Detection and Automatic Penalty Management using GPS-enabled Vehicular Monitoring Technology**

A public-facing traffic fine lookup & payment portal (no login required for the public) with a
separate authenticated Super Admin backend. Payments run through **Stripe TEST mode only**.

This is an academic/demo prototype — not affiliated with BRTA, Bangladesh Police, or any
government body.

---

## Architecture

```
smart-e-fining/
├── backend/      Node.js + Express + Mongoose API, Stripe checkout + webhook, admin auth
└── frontend/     React + Vite + Tailwind public portal + admin dashboard
```

Data flow: `MongoDB → Backend API → Public Portal → Stripe TEST Checkout → Stripe Webhook →
Backend verifies signature → MongoDB fine.status = PAID → fine disappears from public blacklist.`

The frontend **never** marks a fine as paid. Only a verified Stripe webhook event does that.

---

## 1. Prerequisites

- Node.js 18+
- A MongoDB instance (local `mongod`, or a free MongoDB Atlas cluster)
- A free [Stripe](https://dashboard.stripe.com/register) account (test mode)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) for local webhook forwarding

## 2. Install

```bash
cd backend && npm install
cd ../frontend && npm install
```

## 3. Environment variables

Copy the examples and fill them in:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**backend/.env**

| Variable | Description |
|---|---|
| `MONGODB_URI` | Connection string, e.g. `mongodb://127.0.0.1:27017/smart_e_fining` |
| `PORT` | API port, default `5000` |
| `FRONTEND_URL` | Used for CORS and Stripe redirect URLs, default `http://localhost:5173` |
| `STRIPE_SECRET_KEY` | From Stripe Dashboard → Developers → API keys (**test** key, `sk_test_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Test publishable key, `pk_test_...` (kept for future use / receipts) |
| `STRIPE_WEBHOOK_SECRET` | From `stripe listen` output (see below), `whsec_...` |
| `JWT_SECRET` | Long random string used to sign admin session tokens |
| `JWT_EXPIRES_IN` | Admin session lifetime, default `8h` |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` | Used once by `npm run seed` to create the first Super Admin. Change the password and re-seed for anything beyond local testing. |

**frontend/.env**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend URL, default `http://localhost:5000` |

Never commit real `.env` files or hardcode secrets.

## 4. MongoDB setup

Point `MONGODB_URI` at a local `mongod` (`mongodb://127.0.0.1:27017/smart_e_fining`) or an Atlas
connection string. No manual schema setup is needed — Mongoose creates collections/indexes on
first write.

## 5. Seed demo data

Creates demo vehicles, GPS devices, a mix of `UNPAID`/`PAID` fines, matching payment records, and
the first Super Admin account (from `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`):

```bash
cd backend
npm run seed
```

## 6. Run the app

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Visit `http://localhost:5173`.

## 7. Stripe test setup

1. Grab your **test mode** keys from the Stripe Dashboard and put them in `backend/.env`.
2. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli), then forward webhooks to your
   local backend:
   ```bash
   stripe login
   stripe listen --forward-to localhost:5000/api/payments/webhook
   ```
3. Copy the `whsec_...` value the CLI prints into `STRIPE_WEBHOOK_SECRET` and restart the backend.
4. On the fine details page, click **Proceed to Secure Payment**, then use a
   [Stripe test card](https://stripe.com/docs/testing) such as `4242 4242 4242 4242`, any future
   expiry, any CVC.
5. Watch the `stripe listen` terminal — it will show the `checkout.session.completed` event
   hitting your webhook, after which the fine flips to `PAID` and disappears from the public list.

## 8. Admin access

Go to `http://localhost:5173/admin/login` and sign in with the credentials from
`SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`. Admin APIs are protected by a JWT issued at login;
all `/admin/api/*` routes (except `/admin/api/auth/login`) require `Authorization: Bearer <token>`.
Passwords are hashed with bcrypt — nothing is ever stored in plain text.

## 9. End-to-end test scenario

1. Run the seed script, start both servers, and start `stripe listen`.
2. Open the homepage — confirm the seeded `UNPAID` fines appear under **Recent Traffic
   Violations**.
3. Click a fine → confirm violation details render correctly.
4. Click **Proceed to Secure Payment** → Stripe Checkout opens.
5. Pay with test card `4242 4242 4242 4242`.
6. Confirm the `stripe listen` terminal logs the webhook call.
7. You're redirected to `/payment/success`, showing the fine ID, amount, and `PAID` status.
8. Return to the homepage / blacklist — the fine no longer appears.
9. Log into `/admin/dashboard` — confirm the fine shows `PAID` and the payment appears under
   Payments/Collected Amount.

## 10. Notes on what's included vs. left as an extension point

- The ESP32 → backend telemetry ingestion endpoint (device-authenticated violation creation) is
  intentionally out of scope for this public-portal prototype; `GPSDevice.apiTokenHash` and the
  admin **Create Fine** endpoint are the seams to build that against.
- Admin vehicle/device management APIs are implemented; the corresponding admin UI screens (
  `VehicleTable`, `DeviceTable`, forms) can be added the same way `AdminDashboard.jsx` consumes
  `services/api.js` — the backend already supports full CRUD for both.
