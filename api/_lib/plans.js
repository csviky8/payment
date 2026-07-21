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

module.exports = {
  plans,
  findPlan,
  formatMoney,
};
