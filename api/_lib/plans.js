const plans = [
  {
    id: "monthly",
    name: "Monthly Access **LLW EQUITY - INTRADAY , SWING & LONG TERM**",
    rp: 1,
    durationLabel: "1 month",
    amountPaise: 50000,
    currency: "INR",
    description: "Start with TSVK INTRADAY access for one month.",
  },
  {
    id: "quarterly",
    name: "3-Month Access **LLW EQUITY - INTRADAY , SWING & LONG TERM**",
    rp: 2,
    durationLabel: "3 months",
    amountPaise: 199900,
    currency: "INR",
    description: "Continue INTRADAY with a better value three-month pack.",
  },
  {
    id: "yearly",
    name: "Yearly Access **LLW EQUITY - INTRADAY , SWING & LONG TERM**",
    rp: 4,
    durationLabel: "1 year",
    amountPaise: 399900,
    currency: "INR",
    description: "Best value for long-term TSVK INTRADAY access.",
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
