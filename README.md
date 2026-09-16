# SHELTY COUTURE — Production-ready fashion website

A full-stack fashion brand and ecommerce starter for **Shelty Couture, Ghana**.

## Included

- Luxury responsive storefront
- Product catalog and categories
- Product detail modal
- Shopping cart
- Checkout/order creation
- Paystack server-side payment initialization
- Paystack callback verification
- Paystack webhook signature verification
- Appointment booking
- Custom tailoring request form
- Fashion Academy student applications (6 months, 1 year, 18 months, 2 years)
- Male and female student enrolment
- Admin student application management
- Contact/WhatsApp CTAs
- Admin login
- Admin dashboard for products, orders and appointments
- PostgreSQL database
- Render-ready deployment
- Supplied Shelty Couture logo already included

## 1. Run locally

Install Node.js 20+ and PostgreSQL.

```bash
npm install
cp .env.example .env
```

Edit `.env` and set:

- `DATABASE_URL`
- `JWT_SECRET`
- `PAYSTACK_SECRET_KEY`
- `PUBLIC_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Then:

```bash
npm start
```

Open:

- Storefront: `http://localhost:3000`
- Admin: `http://localhost:3000/admin.html`
- Health: `http://localhost:3000/api/health`

The server automatically creates the database tables and a default admin account.

## 2. Paystack

The site initializes Paystack payments from the backend so the secret key is never exposed in browser code.

Set:

```text
PAYSTACK_SECRET_KEY=sk_test_...
PUBLIC_URL=https://YOUR-RAILWAY-DOMAIN
```

Use your Paystack Dashboard to configure the webhook URL:

```text
https://YOUR-RAILWAY-DOMAIN/api/paystack/webhook
```

The webhook uses Paystack's `x-paystack-signature` HMAC-SHA512 validation.

For production:
1. Test the complete checkout in Paystack Test Mode.
2. Confirm successful orders are marked paid.
3. Switch to your live Paystack secret key.
4. Update the webhook URL to your live domain.
5. Never commit `.env` or secret keys to GitHub.

## 3. Render deployment

1. Create a GitHub repository.
2. Push all files in this folder.
3. Create a Render Web Service from the GitHub repository.
4. Create/connect a PostgreSQL database and set `DATABASE_URL` in the Render service environment.
5. Add `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PAYSTACK_SECRET_KEY`, and `PUBLIC_URL`.
6. Build command: `npm install`
7. Start command: `npm start`
8. Deploy and open the generated Render domain.
9. In Paystack, set the webhook URL to `/api/paystack/webhook`.
10. Add your custom domain in Render when ready.

## 4. Important content setup

The database starts with sample catalogue entries so the design can be previewed. Replace the sample products/prices/images from the Admin Dashboard before launch.

Recommended product fields:
- Name
- Category
- Price in GHS
- Sizes
- Colors
- Description
- Image URL
- Featured
- Inventory

## 5. Admin

Visit `/admin.html`.

The default credentials are taken from:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Change these immediately in production.

## 6. Brand details already configured

- Brand: Shelty Couture
- Country: Ghana
- Email: sheltycouture@gmail.com
- WhatsApp: +233558298615
- Instagram/TikTok handle: @sheltycouture
- Tagline: Designed to Define You.

## Security notes

This is designed to be a strong deployable foundation, but before accepting significant production volume, add:
- rate limiting
- CSRF protection for any cookie-based auth
- transactional email provider
- image CDN/object storage
- backups and monitoring
- stricter admin role management
- stock reservation logic for high-volume checkout


## Fashion Academy

The public website includes a Fashion Academy section for students who want to learn directly from Shelty Couture.

Available durations:
- 6 Months — Foundation
- 1 Year — Professional
- 18 Months — Advanced
- 2 Years — Mastery

Both male and female students can apply. Applications are stored in PostgreSQL and can be managed from **Admin → Student Applications**.


### Academy pricing
Training fees start at **GH₵3,500** and increase by 40% at each longer programme: **6 Months GH₵3,500; 1 Year GH₵4,900; 18 Months GH₵6,860; 2 Years GH₵9,604**.


## Version 5 — Luxury Ghanaian Atelier Redesign
- Editorial luxury visual system with deep atelier green, ivory and sage accents.
- Refined navigation, responsive mobile menu, WhatsApp contact actions and floating WhatsApp button.
- New brand-introduction, atelier-method/process and premium academy presentation sections.
- Fashion Academy pricing: 6 Months GH₵3,500; 1 Year GH₵4,900; 18 Months GH₵6,860; 2 Years GH₵9,604.
- Student application form is wired to `POST /api/student-applications`.
- Checkout currency display updated to GH₵.
- Remote editorial fashion imagery is used as a temporary visual layer; replace with Shelty Couture original garment/atelier/student photography for the strongest brand identity.


## Local development mode (no PostgreSQL required)

If `DATABASE_URL` is not set, the website automatically runs in **LOCAL DEVELOPMENT MODE** using an in-memory PostgreSQL-compatible database. You do not need to install PostgreSQL on your computer.

Run:

```bash
npm install
npm start
```

Then open:

`http://localhost:3000`

Local data (appointments, student applications, orders, admin data) resets when the server stops. Paystack checkout is simulated locally so you can test the website flow. For Railway/production, set `DATABASE_URL` and `PAYSTACK_SECRET_KEY` in the environment variables.
