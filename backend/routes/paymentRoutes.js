const express = require("express");
const { asyncHandler } = require("../middleware/auth");
const { createCheckoutSession, getSessionStatus } = require("../controllers/paymentController");

const router = express.Router();

router.post("/payments/create-checkout-session", asyncHandler(createCheckoutSession));
router.get("/payments/session-status/:sessionId", asyncHandler(getSessionStatus));

module.exports = router;
