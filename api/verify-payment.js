const crypto = require("node:crypto");

function safeCompare(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

module.exports = function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

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

  const secret = process.env.RAZORPAY_KEY_SECRET || "";
  if (!secret) {
    return res.status(500).json({
      ok: false,
      error: "Razorpay secret is missing in the Vercel environment.",
    });
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (!safeCompare(expectedSignature, razorpay_signature)) {
    return res.status(400).json({
      ok: false,
      error: "Signature mismatch. Payment is not verified.",
    });
  }

  return res.status(200).json({
    ok: true,
    verified: true,
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
  });
};
