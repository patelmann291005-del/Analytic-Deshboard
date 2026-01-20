const express = require("express");
const {
  getAllModels,
  getModelConfig,
  toggleModel,
  updateAlgorithm,
  updateParameters,
  saveModel,
  getModelAccuracy,
  getModelStats,
} = require("../controllers/aiModelController");

const router = express.Router();

// Get all AI models
router.get("/config", getAllModels);

// Get model stats/summary
router.get("/stats", getModelStats);

// Get specific model config
router.get("/:id", getModelConfig);

// Toggle model enable/disable
router.post("/:id/toggle", toggleModel);

// Update algorithm
router.post("/:id/algorithm", updateAlgorithm);

// Update parameters
router.post("/:id/parameters", updateParameters);

// Save complete model configuration
router.post("/:id/save", saveModel);

// Get model accuracy
router.get("/:id/accuracy", getModelAccuracy);

module.exports = router;
