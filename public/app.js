const plansRoot = document.getElementById("plans");
const signupForm = document.getElementById("signup-form");
const signupStatus = document.getElementById("signup-status");
const subscriptionOutput = document.getElementById("subscription-output");

let activeEmail = localStorage.getItem("pulsepass-email") || "";
let activeName = localStorage.getItem("pulsepass-name") || "";

function setStatus(message, tone = "info") {
  signupStatus.dataset.tone = tone;
  signupStatus.textContent = message;
}

function getSignupData() {
  if (signupForm) {
    const data = new FormData(signupForm);
    return {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim().toLowerCase(),
    };
  }

  return { name: activeName, email: activeEmail };
}

async function loadPlans() {
  const response = await fetch("/api/plans");
  const payload = await response.json();

  plansRoot.innerHTML = payload.plans
    .map(
      (plan) => `
        <article class="plan-card">
          <div class="plan-badge">${plan.rpLabel}</div>
          <h3>${plan.name}</h3>
          <p class="plan-duration">${plan.durationLabel}</p>
          <p class="plan-price">${plan.amountLabel}</p>
          <p class="plan-desc">${plan.description}</p>
          <button class="primary" data-plan="${plan.id}">Pay now</button>
        </article>
      `
    )
    .join("");

  plansRoot.querySelectorAll("button[data-plan]").forEach((button) => {
    button.addEventListener("click", () => checkout(button.dataset.plan));
  });
}

async function saveSignup(event) {
  event.preventDefault();
  const { name, email } = getSignupData();

  if (!name && !email) {
    setStatus("You can leave this blank and pay directly.", "info");
    return;
  }

  if (name) {
    activeName = name;
    localStorage.setItem("pulsepass-name", activeName);
  }

  if (email) {
    activeEmail = email;
    localStorage.setItem("pulsepass-email", activeEmail);
  }

  setStatus("Optional contact details saved in your browser.", "success");
}

async function checkout(planId) {
  const { name, email } = getSignupData();
  setStatus(`Creating Razorpay order for ${planId}...`, "info");

  const response = await fetch("/api/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planId,
      receipt: `pulsepass_${planId}_${Date.now()}`,
    }),
  });

  const payload = await response.json();
  if (!payload.ok) {
    setStatus(payload.error || "Checkout failed.", "error");
    return;
  }

  if (payload.demo) {
    window.location.href = payload.checkoutUrl;
    return;
  }

  const options = {
    key: payload.key_id,
    amount: payload.amount,
    currency: payload.currency,
    name: "PulsePass Education",
    description: `${payload.plan.name} plan (${payload.plan.rp} RP)`,
    order_id: payload.order_id,
    prefill: {
      name,
      email,
    },
    theme: {
      color: "#78d6ff",
    },
    handler: async function (responseData) {
      const verifyResponse = await fetch("/api/verify-subscription", {
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
        subscriptionOutput.textContent = JSON.stringify(verifyPayload, null, 2);
        setStatus(verifyPayload.error || "Payment verification failed.", "error");
        return;
      }

      localStorage.setItem("pulsepass-order-id", verifyPayload.order_id || payload.order_id || "");
      localStorage.setItem("pulsepass-payment-id", verifyPayload.payment_id || "");
      window.location.href = `/success.html?order_id=${encodeURIComponent(
        verifyPayload.order_id
      )}&payment_id=${encodeURIComponent(verifyPayload.payment_id)}&receipt=${encodeURIComponent(
        verifyPayload.receipt || ""
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
    setStatus(message, "error");
    subscriptionOutput.textContent = JSON.stringify(response, null, 2);
  });
  razorpay.open();
}

async function lookupSubscription() {
  const lastOrderId = localStorage.getItem("pulsepass-order-id") || "";

  if (lastOrderId) {
    const response = await fetch(`/api/payment/${encodeURIComponent(lastOrderId)}`);
    const payload = await response.json();
    subscriptionOutput.textContent = JSON.stringify(payload, null, 2);
    return;
  }

  subscriptionOutput.textContent = "No order saved yet. You can still pay without sign-up.";
}

signupForm.addEventListener("submit", saveSignup);
document.getElementById("status-button").addEventListener("click", lookupSubscription);

if (activeEmail && signupForm) {
  signupForm.elements.email.value = activeEmail;
}

if (activeName && signupForm) {
  signupForm.elements.name.value = activeName;
}

loadPlans().catch((error) => {
  plansRoot.innerHTML = `<p class="status error">Unable to load plans: ${error.message}</p>`;
});
