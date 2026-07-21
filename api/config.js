module.exports = function handler(_req, res) {
  res.status(200).json({
    ok: true,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  });
};
