const express = require("express");
const { asyncHandler } = require("../middleware/auth");
const { getRecentFines, getFines, getFineById, getStats } = require("../controllers/fineController");

const router = express.Router();

router.get("/fines/recent", asyncHandler(getRecentFines));
router.get("/fines/:fineId", asyncHandler(getFineById));
router.get("/fines", asyncHandler(getFines));
router.get("/stats", asyncHandler(getStats));

module.exports = router;
