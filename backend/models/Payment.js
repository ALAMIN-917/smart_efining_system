const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, required: true, unique: true, index: true },
    fineId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },

    stripeSessionId: { type: String, unique: true, sparse: true, index: true },
    stripePaymentIntentId: { type: String, unique: true, sparse: true, index: true },

    status: {
      type: String,
      enum: ["PENDING", "SUCCEEDED", "FAILED"],
      default: "PENDING",
    },

    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", PaymentSchema);
