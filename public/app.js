const plansRoot = document.getElementById("plans");
const checkoutStatus = document.getElementById("checkout-status");
const paymentOutput = document.getElementById("payment-output");
const statusButton = document.getElementById("status-button");

function setStatus(message, tone = "info") {
  checkoutStatus.dataset.tone = tone;
  checkoutStatus.textContent = message;
}

async function loadPlans() {
  const response = await fetch("/api/plans");
  const payload = await response.json();

  plansRoot.innerHTML = payload.plans
    .map(
      (plan) => `
        <article class="plan-card">
          <div class="plan-card__header">
            <span class="plan-badge">${plan.rpLabel}</span>
            <span class="plan-duration">${plan.durationLabel}</span>
          </div>
          <h3>${plan.name}</h3>
          <p class="plan-price">${plan.amountLabel}</p>
          <p class="plan-desc">${plan.description}</p>
          <button class="primary-button" data-plan="${plan.id}">
            Subscribe to Combo - ${plan.amountLabel}
          </button>
        </article>
      `
    )
    .join("");

  plansRoot.querySelectorAll("button[data-plan]").forEach((button) => {
    button.addEventListener("click", () => checkout(button.dataset.plan));
  });
}

async function checkout(planId) {
  setStatus(`Creating TSVK order for ${planId}...`, "info");

  const response = await fetch("/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planId,
      receipt: `tsvk_${planId}_${Date.now()}`,
    }),
  });

  const payload = await response.json();
  if (!payload.ok) {
    setStatus(payload.error || "Checkout failed.", "error");
    return;
  }

  const options = {
    key: payload.key_id,
    amount: payload.amount,
    currency: payload.currency,
    name: "TSVK",
    description: `${payload.plan.name} combo (${payload.plan.rp} RP)`,
    order_id: payload.order_id,
    prefill: {
      name: "TSVK Student",
      email: "student@tsvk.in",
      contact: "9999999999",
    },
    theme: {
      color: "#2589ff",
    },
    handler: async function (responseData) {
      const verifyResponse = await fetch("/api/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_order_id: responseData.razorpay_order_id,
          razorpay_payment_id: responseData.razorpay_payment_id,
          razorpay_signature: responseData.razorpay_signature,
        }),
      });

      const verifyPayload = await verifyResponse.json();
      if (!verifyPayload.ok) {
        paymentOutput.textContent = JSON.stringify(verifyPayload, null, 2);
        setStatus(verifyPayload.error || "Payment verification failed.", "error");
        return;
      }

      localStorage.setItem("tsvk-order-id", verifyPayload.order_id || payload.order_id || "");
      localStorage.setItem("tsvk-payment-id", verifyPayload.payment_id || "");
      window.location.href = `/success.html?order_id=${encodeURIComponent(
        verifyPayload.order_id
      )}&payment_id=${encodeURIComponent(verifyPayload.payment_id)}&receipt=${encodeURIComponent(
        verifyPayload.receipt || payload.receipt || ""
      )}`;
    },
    modal: {
      ondismiss: () => {
        setStatus("Checkout closed before payment was completed.", "info");
      },
    },
  };

  const razorpay = new Razorpay(options);
  razorpay.on("payment.failed", (response) => {
    const message =
      response?.error?.description || response?.error?.reason || "Payment failed in Razorpay.";
    setStatus(
      `${message} For India test mode, choose UPI and enter success@razorpay.`,
      "error"
    );
    paymentOutput.textContent = JSON.stringify(response, null, 2);
  });
  razorpay.open();
}

async function lookupPayment() {
  const lastOrderId = localStorage.getItem("tsvk-order-id") || "";

  if (!lastOrderId) {
    paymentOutput.textContent = "No order saved yet. Choose a plan to start payment.";
    return;
  }

  const response = await fetch(`/api/payment/${encodeURIComponent(lastOrderId)}`);
  const payload = await response.json();
  paymentOutput.textContent = JSON.stringify(payload, null, 2);
}

statusButton.addEventListener("click", lookupPayment);

loadPlans().catch((error) => {
  plansRoot.innerHTML = `<p class="status" data-tone="error">Unable to load plans: ${error.message}</p>`;
});
