const { plans, formatMoney } = require("./_lib/plans");

module.exports = function handler(_req, res) {
  res.status(200).json({
    plans: plans.map((plan) => ({
      ...plan,
      amountLabel: formatMoney(plan.amountPaise, plan.currency),
      rpLabel: `${plan.rp} RP`,
    })),
  });
};
