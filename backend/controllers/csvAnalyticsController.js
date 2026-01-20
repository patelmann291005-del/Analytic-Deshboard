const Data = require("../models/Data");

/**
 * =====================================
 * GET /api/csv/summary
 * =====================================
 */
exports.getCsvSummary = async (req, res) => {
  try {
    const data = await Data.find({ isActive: true });

    const totalValue = data.reduce((sum, d) => sum + d.value, 0);

    const productMap = {};
    data.forEach(d => {
      productMap[d.title] = (productMap[d.title] || 0) + d.value;
    });

    const sorted = Object.entries(productMap).sort(
      (a, b) => b[1] - a[1]
    );

    res.json({
      totalValue,
      bestCategory: sorted[0]?.[0],
      worstCategory: sorted[sorted.length - 1]?.[0],
      totalRecords: data.length
    });
  } catch (err) {
    res.status(500).json({ message: "CSV summary failed" });
  }
};

/**
 * =====================================
 * GET /api/csv/batch-insights
 * =====================================
 */
exports.getBatchInsights = async (req, res) => {
  try {
    const batches = await Data.aggregate([
      {
        $group: {
          _id: "$batchId",
          totalValue: { $sum: "$value" },
          uploadedAt: { $max: "$uploadedAt" }
        }
      },
      { $sort: { uploadedAt: 1 } }
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
          ? "CSV data performance is improving"
          : "Review uploaded CSV data for optimization"
    });
  } catch (err) {
    res.status(500).json({ message: "Batch insight failed" });
  }
};
