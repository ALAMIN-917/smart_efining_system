const Stripe = require("stripe");
const Fine = require("../models/Fine");
const Payment = require("../models/Payment");
const { ApiError } = require("../middleware/errorHandler");
const { generatePaymentId } = require("../utils/generateIds");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/payments/create-checkout-session
// Body: { fineId }  — amount is NEVER accepted from the client.
const createCheckoutSession = async (req, res) => {
  const fineId = String(req.body.fineId || "").trim();
  if (!/^[A-Za-z0-9-]{3,40}$/.test(fineId)) {
    throw new ApiError(400, "Invalid fine identifier.");
  }

  const fine = await Fine.findOne({ fineId });
  if (!fine) throw new ApiError(404, "Fine not found.");
  if (fine.status === "PAID") throw new ApiError(409, "This fine has already been paid.");
  if (fine.status === "CANCELLED") throw new ApiError(409, "This fine has been cancelled.");

  // Amount always comes from the database record, in the smallest currency unit.
  const amountInPaisa = Math.round(fine.fineAmount * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "bdt",
          product_data: {
            name: `Traffic Fine ${fine.fineId}`,
            description: `${fine.violationType} — ${fine.registrationNumber}`,
          },
          unit_amount: amountInPaisa,
        },
        quantity: 1,
      },
    ],
    metadata: { fineId: fine.fineId },
    success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?fineId=${fine.fineId}`,
  });

  // Track the attempt as PENDING; the webhook is the only thing that flips it to SUCCEEDED.
  await Payment.findOneAndUpdate(
    { fineId: fine.fineId, status: "PENDING" },
    {
      paymentId: generatePaymentId(),
      fineId: fine.fineId,
      amount: fine.fineAmount,
      stripeSessionId: session.id,
      status: "PENDING",
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, data: { checkoutUrl: session.url, sessionId: session.id } });
};

// GET /api/payments/session-status/:sessionId  — used by the success page to
// show details without trusting the frontend to declare success itself.
const getSessionStatus = async (req, res) => {
  const payment = await Payment.findOne({ stripeSessionId: req.params.sessionId }).lean();
  if (!payment) throw new ApiError(404, "Payment session not found.");
  const fine = await Fine.findOne({ fineId: payment.fineId }).lean();
  res.json({
    success: true,
    data: {
      status: payment.status,
      fineId: payment.fineId,
      amount: payment.amount,
      paidAt: payment.paidAt,
      registrationNumber: fine?.registrationNumber,
      fineStatus: fine?.status,
    },
  });
};

// POST /api/payments/webhook
// IMPORTANT: this route must receive the RAW body (see server.js) so the
// Stripe signature can be verified. This is the ONLY place fine.status
// is ever set to PAID.
const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[webhook] signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const fineId = session.metadata?.fineId;

    if (fineId) {
      // Idempotency: only act if this payment hasn't already been recorded as succeeded.
      const payment = await Payment.findOne({ stripeSessionId: session.id });
      if (payment && payment.status !== "SUCCEEDED") {
        payment.status = "SUCCEEDED";
        payment.stripePaymentIntentId = session.payment_intent || payment.stripePaymentIntentId;
        payment.paidAt = new Date();
        await payment.save();

        await Fine.findOneAndUpdate(
          { fineId, status: { $ne: "PAID" } },
          { status: "PAID" }
        );
      }
    }
  }

  // Always 200 so Stripe doesn't keep retrying an event we've already handled.
  res.json({ received: true });
};

module.exports = { createCheckoutSession, getSessionStatus, stripeWebhook };
