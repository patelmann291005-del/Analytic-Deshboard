const ApiData = require("../models/ApiData");

// SUMMARY
exports.getApiSummary = async (req, res) => {
  const data = await ApiData.find();

  const totalValue = data.reduce((s, d) => s + d.value, 0);

  res.json({
    totalValue,
    totalRecords: data.length
  });
};

// BATCH INSIGHTS
exports.getApiBatchInsights = async (req, res) => {
  const batches = await ApiData.aggregate([
    {
      $group: {
        _id: "$batchId",
        totalValue: { $sum: "$value" },
        fetchedAt: { $max: "$fetchedAt" }
      }
    },
    { $sort: { fetchedAt: 1 } }
  ]);

  let trend = "Stable";
  if (batches.length >= 2) {
    const last = batches[batches.length - 1].totalValue;
    const prev = batches[batches.length - 2].totalValue;
    if (last > prev) trend = "Increasing";
    else if (last < prev) trend = "Decreasing";
  }

  res.json({
    batches,
    trend,
    recommendation:
      trend === "Increasing"
        ? "API metrics improving"
        : "Review API-based metrics"
  });
};
