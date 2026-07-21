require("dotenv").config();

const express = require("express");
const crypto = require("node:crypto");
const Razorpay = require("razorpay");

const app = express();
const PORT = process.env.PORT || 3000;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

const razorpay =
  RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET
    ? new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET,
      })
    : null;

const plans = [
  {
    id: "monthly",
    name: "Monthly",
    rp: 1,
    durationLabel: "1 month",
    amountPaise: 19900,
    currency: "INR",
    description: "A simple starter plan for short access and trial use.",
  },
  {
    id: "quarterly",
    name: "3-Month",
    rp: 2,
    durationLabel: "3 months",
    amountPaise: 39900,
    currency: "INR",
    description: "A better value plan for customers who stay a little longer.",
  },
  {
    id: "yearly",
    name: "Yearly",
    rp: 4,
    durationLabel: "1 year",
    amountPaise: 99900,
    currency: "INR",
    description: "Best value for long-term members and annual access.",
  },
];

const ordersById = new Map();
const paymentsByOrderId = new Map();

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

function findPlan(planId) {
  return plans.find((plan) => plan.id === planId);
}

function formatMoney(paise, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function normalizeString(value) {
  return String(value || "").trim();
}

function safeCompare(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

app.get("/api/plans", (_req, res) => {
  res.json({
    plans: plans.map((plan) => ({
      ...plan,
      amountLabel: formatMoney(plan.amountPaise, plan.currency),
      rpLabel: `${plan.rp} RP`,
    })),
  });
});

app.get("/api/config", (_req, res) => {
  res.json({
    ok: true,
    razorpayKeyId: RAZORPAY_KEY_ID,
  });
});

app.post("/api/create-order", async (req, res) => {
  try {
    const { planId, amount, currency, receipt } = req.body || {};
    const plan = planId ? findPlan(planId) : null;

    const orderAmount = plan ? plan.amountPaise : Number(amount);
    const orderCurrency = normalizeString(currency || (plan && plan.currency) || "INR").toUpperCase();
    const orderReceipt =
      normalizeString(receipt) ||
      `rcpt_${plan ? plan.id : "guest"}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (!Number.isInteger(orderAmount) || orderAmount < 100) {
      return res.status(400).json({
        ok: false,
        error: "Amount must be at least 100 paise.",
      });
    }

    if (!razorpay) {
      return res.status(500).json({
        ok: false,
        error: "Razorpay keys are missing. Add them to .env before creating orders.",
      });
    }

    const order = await razorpay.orders.create({
      amount: orderAmount,
      currency: orderCurrency,
      receipt: orderReceipt,
      notes: {
        planId: plan ? plan.id : "",
        rp: plan ? String(plan.rp) : "",
        source: "PulsePass",
      },
    });

    ordersById.set(order.id, {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      planId: plan ? plan.id : "",
      rp: plan ? plan.rp : null,
      createdAt: new Date().toISOString(),
    });

    res.json({
      ok: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      key_id: RAZORPAY_KEY_ID,
      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            rp: plan.rp,
            amountLabel: formatMoney(plan.amountPaise, plan.currency),
          }
        : null,
    });
  } catch (error) {
    if (error?.statusCode === 401 || error?.error?.code === "BAD_REQUEST_ERROR") {
      return res.status(401).json({
        ok: false,
        error: "Razorpay authentication failed. Check KEY_ID and KEY_SECRET.",
      });
    }

    res.status(500).json({
      ok: false,
      error: error.message || "Unable to create order.",
    });
  }
});

app.post("/api/verify-payment", (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body || {};

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({
      ok: false,
      error: "Missing Razorpay payment fields.",
    });
  }

  const orderRecord = ordersById.get(razorpay_order_id);
  if (!orderRecord) {
    return res.status(400).json({
      ok: false,
      error: "Unknown order_id. Create the order on the server first.",
    });
  }

  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (!safeCompare(expectedSignature, razorpay_signature)) {
    return res.status(400).json({
      ok: false,
      error: "Signature mismatch. Payment is not verified.",
    });
  }

  const paymentRecord = {
    ...orderRecord,
    razorpay_payment_id,
    razorpay_signature,
    verified: true,
    verifiedAt: new Date().toISOString(),
  };

  paymentsByOrderId.set(razorpay_order_id, paymentRecord);

  res.json({
    ok: true,
    verified: true,
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
    receipt: orderRecord.receipt,
    planId: orderRecord.planId || null,
    rp: orderRecord.rp,
  });
});

app.get("/api/payment/:orderId", (req, res) => {
  const orderId = normalizeString(req.params.orderId);
  const record = paymentsByOrderId.get(orderId) || ordersById.get(orderId) || null;

  if (!record) {
    return res.json({ ok: true, payment: null });
  }

  res.json({
    ok: true,
    payment: record,
    plan: record.planId ? findPlan(record.planId) : null,
  });
});

app.listen(PORT, () => {
  console.log(`Razorpay standard checkout site running at http://localhost:${PORT}`);
});
