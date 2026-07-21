const { randomBytes } = require("node:crypto");
const { findPlan, formatMoney } = require("./_lib/plans");
const { getRazorpayClient } = require("./_lib/razorpay");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  try {
    const { planId, amount, currency, receipt } = req.body || {};
    const plan = planId ? findPlan(planId) : null;
    const orderAmount = plan ? plan.amountPaise : Number(amount);
    const orderCurrency = String(currency || (plan && plan.currency) || "INR").toUpperCase();
    const orderReceipt =
      String(receipt || "").trim() ||
      `rcpt_${plan ? plan.id : "guest"}_${Date.now()}_${randomBytes(3).toString("hex")}`;

    if (!Number.isInteger(orderAmount) || orderAmount < 100) {
      return res.status(400).json({
        ok: false,
        error: "Amount must be at least 100 paise.",
      });
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return res.status(500).json({
        ok: false,
        error: "Razorpay keys are missing in the Vercel environment.",
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

    return res.status(200).json({
      ok: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      key_id: process.env.RAZORPAY_KEY_ID || "",
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

    return res.status(500).json({
      ok: false,
      error: error.message || "Unable to create order.",
    });
  }
};
