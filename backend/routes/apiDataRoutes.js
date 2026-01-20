const express = require("express");
const multer = require("multer");
const {
  fetchApiData,
  uploadFile
} = require("../controllers/apiDataController");

const {
  getApiSummary,
  getApiBatchInsights
} = require("../controllers/apiAnalyticsController");

const {
  updateApiDataRecord,
  getApiDataHistory,
  rollbackApiDataRecord,
  getApiDataBatchVersions,
  deleteApiDataRecord
} = require("../controllers/apiVersioningController");

const ApiData = require("../models/ApiData");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

// Existing routes
router.post("/api-data/fetch", fetchApiData);
router.post("/api-data/upload-file", upload.single("file"), uploadFile);
router.get("/api-data/summary", getApiSummary);
router.get("/api-data/batch-insights", getApiBatchInsights);

// ✅ NEW ROUTES (REQUIRED)

// Get ALL API data
router.get("/api-data/all", async (req, res) => {
  const data = await ApiData.find({ isActive: true }).sort({ fetchedAt: -1 });
  res.json(data);
});

// Get UNIQUE batches
router.get("/api-data/batches", async (req, res) => {
  const batches = await ApiData.aggregate([
    {
      $group: {
        _id: "$batchId",
        fetchedAt: { $max: "$fetchedAt" }
      }
    },
    { $sort: { fetchedAt: -1 } }
  ]);

  res.json(batches);
});

// Get data by batch
router.get("/api-data/batch/:batchId", async (req, res) => {
  const data = await ApiData.find({
    batchId: req.params.batchId,
    isActive: true
  }).sort({ fetchedAt: -1 });

  res.json(data);
});

// Versioning routes for API data
// Update an API data record with versioning
router.put("/api-data/:id", updateApiDataRecord);

// Get version history for an API data record
router.get("/api-data/:id/history", getApiDataHistory);

// Rollback an API data record to a specific version
router.post("/api-data/:id/rollback/:version", rollbackApiDataRecord);

// Get all versions for an API data batch
router.get("/api-data/batch/:batchId/versions", getApiDataBatchVersions);

// Soft delete an API data record
router.delete("/api-data/:id", deleteApiDataRecord);

module.exports = router;

// Delete batch
router.delete("/api-data/batch/:batchId", async (req, res) => {
  await ApiData.deleteMany({
    batchId: req.params.batchId
  });

  res.json({ message: "API batch deleted" });
});
