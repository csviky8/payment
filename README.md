# PulsePass Education Payments

This project is now Vercel-ready with Razorpay Standard Web Checkout.

## What it does
- Shows 3 educational payment plans:
  - Monthly: 1 RP
  - 3-Month: 2 RP
  - Yearly: 4 RP
- Creates a Razorpay order on the backend
- Opens Razorpay Checkout from the frontend
- Verifies the payment signature on the backend

## Local demo
1. Run `npm install`
2. Keep the local `.env` file with your Razorpay test keys
3. Run `npm start`
4. Open `http://localhost:3000`

## Vercel demo deploy
1. Install the Vercel CLI if needed: `npm i -g vercel`
2. Log in: `vercel login`
3. From the project root, run `vercel`
4. In the Vercel dashboard, add these environment variables:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
5. Deploy to production when ready: `vercel --prod`

## API routes on Vercel
- `GET /api/plans`
- `GET /api/config`
- `POST /api/create-order`
- `POST /api/verify-payment`
- `GET /api/payment/:orderId`

## Notes
- The browser only receives the public Razorpay key ID.
- The secret key stays in environment variables on the server.
- `api/payment/:orderId` is a demo lookup route unless you connect a database or KV store.

