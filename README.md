# TSVK Combo Checkout

This project is a Vercel-ready Razorpay Standard Checkout website for TSVK learning access.

## Plans
- Monthly Access: 1 RP, INR 199
- 3-Month Access: 2 RP, INR 399
- Yearly Access: 4 RP, INR 999

## Flow
1. User opens the TSVK combo checkout page.
2. User chooses a plan without signup.
3. Frontend calls `POST /api/create-order`.
4. Razorpay Checkout opens with the returned order id.
5. Frontend sends payment id, order id, and signature to `POST /api/verify-payment`.
6. Backend verifies the signature with Razorpay key secret.

## Local Run
```powershell
npm install
npm start
```

Open `http://localhost:3000`.

## Vercel Environment
Set these in Vercel before accepting payments:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`

Use `rzp_live_...` keys for real payments. Use `rzp_test_...` keys only for sandbox testing.
