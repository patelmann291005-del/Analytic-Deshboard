const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

// Export routes
router.get("/export/pdf", reportController.exportPDF);
router.get("/export/excel", reportController.exportExcel);

module.exports = router;
