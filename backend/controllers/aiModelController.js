// In-memory AI models storage
let aiModels = {
  "sales-prediction": {
    id: "sales-prediction",
    name: "Sales Forecasting",
    enabled: true,
    algorithm: "LSTM",
    accuracy: 87.5,
    parameters: {
      learningRate: 0.001,
      epochs: 100,
      batchSize: 32,
      timeSteps: 30,
    },
  },
  "demand-forecast": {
    id: "demand-forecast",
    name: "Demand Forecasting",
    enabled: true,
    algorithm: "Prophet",
    accuracy: 91.2,
    parameters: {
      seasonality: true,
      changePointPriorScale: 0.05,
      seasonalityMode: "additive",
      interval: "weekly",
    },
  },
  "anomaly-detection": {
    id: "anomaly-detection",
    name: "Anomaly Detection",
    enabled: true,
    algorithm: "Isolation Forest",
    accuracy: 94.8,
    parameters: {
      contaminationFactor: 0.05,
      randomState: 42,
      nEstimators: 100,
      sensitivity: 0.8,
    },
  },
  "customer-clustering": {
    id: "customer-clustering",
    name: "Customer Segmentation",
    enabled: false,
    algorithm: "K-Means",
    accuracy: 85.3,
    parameters: {
      nClusters: 5,
      maxIterations: 300,
      randomState: 42,
      nInit: 10,
    },
  },
};

// Get all AI models configuration
const getAllModels = (req, res) => {
  try {
    res.json(Object.values(aiModels));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single model configuration
const getModelConfig = (req, res) => {
  try {
    const { id } = req.params;
    const model = aiModels[id];

    if (!model) {
      return res.status(404).json({ message: "Model not found" });
    }

    res.json(model);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle model enable/disable
const toggleModel = (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    if (!aiModels[id]) {
      return res.status(404).json({ message: "Model not found" });
    }

    aiModels[id].enabled = enabled;
    res.json({
      message: `Model ${enabled ? "enabled" : "disabled"}`,
      model: aiModels[id],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update model algorithm
const updateAlgorithm = (req, res) => {
  try {
    const { id } = req.params;
    const { algorithm } = req.body;

    if (!aiModels[id]) {
      return res.status(404).json({ message: "Model not found" });
    }

    aiModels[id].algorithm = algorithm;
    res.json({
      message: "Algorithm updated",
      model: aiModels[id],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update model parameters
const updateParameters = (req, res) => {
  try {
    const { id } = req.params;
    const { parameters } = req.body;

    if (!aiModels[id]) {
      return res.status(404).json({ message: "Model not found" });
    }

    aiModels[id].parameters = {
      ...aiModels[id].parameters,
      ...parameters,
    };
    res.json({
      message: "Parameters updated",
      model: aiModels[id],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Save model configuration
const saveModel = (req, res) => {
  try {
    const { id } = req.params;
    const { algorithm, parameters, enabled } = req.body;

    if (!aiModels[id]) {
      return res.status(404).json({ message: "Model not found" });
    }

    if (algorithm) aiModels[id].algorithm = algorithm;
    if (parameters) aiModels[id].parameters = parameters;
    if (enabled !== undefined) aiModels[id].enabled = enabled;

    res.json({
      message: "Model configuration saved",
      model: aiModels[id],
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get model accuracy
const getModelAccuracy = (req, res) => {
  try {
    const { id } = req.params;

    if (!aiModels[id]) {
      return res.status(404).json({ message: "Model not found" });
    }

    res.json({
      id,
      name: aiModels[id].name,
      accuracy: aiModels[id].accuracy,
      algorithm: aiModels[id].algorithm,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get overall AI model stats
const getModelStats = (req, res) => {
  try {
    const models = Object.values(aiModels);
    const activeCount = models.filter((m) => m.enabled).length;
    const avgAccuracy =
      models.reduce((sum, m) => sum + m.accuracy, 0) / models.length;

    res.json({
      totalModels: models.length,
      activeModels: activeCount,
      averageAccuracy: parseFloat(avgAccuracy.toFixed(2)),
      models: models.map((m) => ({
        id: m.id,
        name: m.name,
        enabled: m.enabled,
        accuracy: m.accuracy,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllModels,
  getModelConfig,
  toggleModel,
  updateAlgorithm,
  updateParameters,
  saveModel,
  getModelAccuracy,
  getModelStats,
};
