// routes/salesRoutes.js
const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const XLSX = require("xlsx");
const {
  getSalesData,
  getTotalRevenue,
  getSalesInsights
} = require("../controllers/salesController");

const {
  updateSalesRecord,
  getSalesHistory,
  rollbackSalesRecord,
  getSalesBatchVersions,
  deleteSalesRecord
} = require("../controllers/salesVersioningController");

const Sales = require("../models/Sales");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

router.get("/sales", getSalesData);
router.get("/sales/all", getSalesData);
router.get("/sales/total-revenue", getTotalRevenue);
router.get("/sales/insights", getSalesInsights);

// Delete all sales data
router.delete("/sales/all", async (req, res) => {
  try {
    console.log("Deleting all sales data...");
    const result = await Sales.deleteMany({});
    console.log("Delete all result:", result);
    res.json({ message: "All sales data deleted", deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Delete all error:", error);
    res.status(500).json({ message: "Failed to delete all sales data", error: error.message });
  }
});

// Upload sales data from CSV/Excel
router.post("/sales/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

      const batchId = req.file.filename;
      const sourceName = req.file.originalname;

    const filePath = req.file.path;
    const fileExtension = req.file.originalname.split(".").pop().toLowerCase();
    const salesData = [];

    if (fileExtension === "csv") {
      // Parse CSV
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on("data", (row) => {
            console.log("CSV Row:", row); // Debug log
            const product = row.Product || row.product || row.PRODUCT || row.Title || row.title || row.TITLE || row.Name || row.name || row.NAME;
            const quantityStr = row.Quantity || row.quantity || row.QUANTITY || row.Value || row.value || row.VALUE;
            const revenueStr = row.Revenue || row.revenue || row.REVENUE || row.Amount || row.amount || row.AMOUNT || row.Price || row.price || row.PRICE;
            
            const quantity = quantityStr ? parseInt(quantityStr) : 0;
            const revenue = revenueStr ? parseFloat(revenueStr) : (quantity || 0);

            console.log("Parsed:", { product, quantity, revenue }); // Debug log

            if (product && (quantity > 0 || revenue > 0)) {
              salesData.push({ 
                product: product.trim(), 
                quantity: quantity || 1, 
                revenue: revenue || quantity || 0, 
                date: new Date(),
                  batchId,
                  source: sourceName,
                version: 1 
              });
            }
          })
          .on("end", resolve)
          .on("error", reject);
      });
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      // Parse Excel
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      jsonData.forEach((row) => {
        console.log("Excel Row:", row); // Debug log
        const product = row.Product || row.product || row.PRODUCT || row.Title || row.title || row.TITLE || row.Name || row.name || row.NAME;
        const quantityStr = row.Quantity || row.quantity || row.QUANTITY || row.Value || row.value || row.VALUE;
        const revenueStr = row.Revenue || row.revenue || row.REVENUE || row.Amount || row.amount || row.AMOUNT || row.Price || row.price || row.PRICE;
        
        const quantity = quantityStr ? parseInt(quantityStr) : 0;
        const revenue = revenueStr ? parseFloat(revenueStr) : (quantity || 0);

        console.log("Parsed:", { product, quantity, revenue }); // Debug log

        if (product && (quantity > 0 || revenue > 0)) {
          salesData.push({ 
            product: product.trim(), 
            quantity: quantity || 1, 
            revenue: revenue || quantity || 0, 
            date: new Date(),
              batchId,
              source: sourceName,
            version: 1 
          });
        }
      });
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: "Invalid file format. Please upload CSV or Excel file" });
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    if (salesData.length === 0) {
      return res.status(400).json({ message: "No valid sales data found in file" });
    }

    // Insert sales data
    await Sales.insertMany(salesData);

    res.json({
      message: "Sales data uploaded successfully",
      recordsAdded: salesData.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Failed to upload sales data", error: error.message });
  }
});

// Get upload batch history (MUST come before DELETE route)
router.get("/sales/batch/history", async (req, res) => {
  try {
    const batches = await Sales.aggregate([
      { $match: { isActive: true } },
      { $group: { 
        _id: "$batchId", 
        count: { $sum: 1 },
        source: { $first: "$source" },
        uploadedAt: { $first: "$createdAt" }
      }},
      { $sort: { uploadedAt: -1 } }
    ]);

    const result = batches.map(batch => ({
      batchId: batch._id,
      count: batch.count,
      source: batch.source || "unknown",
      uploadedAt: batch.uploadedAt || new Date()
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete entire batch
router.delete("/sales/batch/:batchId", async (req, res) => {
  try {
    const { batchId } = req.params;
    console.log("Delete batch requested for:", batchId);
    const result = await Sales.deleteMany({ batchId });
    console.log("Delete result:", result);
    res.json({ message: "Batch deleted", deletedCount: result.deletedCount });
  } catch (error) {
    console.error("Delete batch error:", error);
    res.status(500).json({ message: "Failed to delete batch", error: error.message });
  }
});

// Versioning routes for sales data
router.put("/sales/:id", updateSalesRecord);
router.get("/sales/:id/history", getSalesHistory);
router.post("/sales/:id/rollback/:version", rollbackSalesRecord);
router.get("/sales/batch/:batchId/versions", getSalesBatchVersions);
router.delete("/sales/:id", deleteSalesRecord);

module.exports = router;
