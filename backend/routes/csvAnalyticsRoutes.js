const express = require("express");
const {
  getCsvSummary,
  getBatchInsights
} = require("../controllers/csvAnalyticsController");

const router = express.Router();

router.get("/csv/summary", getCsvSummary);
router.get("/csv/batch-insights", getBatchInsights);

module.exports = router;
