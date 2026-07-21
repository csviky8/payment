module.exports = function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "Method not allowed." });
  }

  return res.status(200).json({
    ok: true,
    orderId: req.query.orderId || "",
    note: "Demo deployment endpoint. If you want stored payment history, add a database or key-value store.",
  });
};
