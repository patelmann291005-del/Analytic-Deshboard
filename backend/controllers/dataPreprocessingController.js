const multer = require("multer");
const Papa = require("papaparse");
const xlsx = require("xlsx");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// In-memory storage (demo)
let processedDataStore = [];
let processingLog = [];
let approvalState = { approved: false, approvedAt: null, approvedBy: null };
let lastRun = null;

// Multer setup
const upload = multer({ dest: "uploads/" });

const addLog = (entry) => {
  const record = { time: new Date().toISOString(), ...entry };
  processingLog.unshift(record);
  // Keep log bounded
  if (processingLog.length > 200) processingLog = processingLog.slice(0, 200);
};

// Helpers
const isMissing = (v) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");
const toNumberOrNull = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return null;
    const n = Number(t.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const normalizeNumericColumns = (rows) => {
  if (!rows.length) return rows;
  const keys = Object.keys(rows[0]);

  // Determine numeric columns and stats
  const stats = {};
  for (const key of keys) {
    let min = Infinity;
    let max = -Infinity;
    let numericCount = 0;
    for (const row of rows) {
      const n = toNumberOrNull(row[key]);
      if (n !== null) {
        numericCount++;
        if (n < min) min = n;
        if (n > max) max = n;
      }
    }
    if (numericCount > 0) {
      stats[key] = { min, max };
    }
  }

  // Apply min-max normalization to numeric columns
  return rows.map((row) => {
    const out = { ...row };
    for (const [key, s] of Object.entries(stats)) {
      const n = toNumberOrNull(row[key]);
      if (n === null) {
        // Keep non-numeric or missing as-is
        continue;
      }
      const range = s.max - s.min;
      out[key] = range > 0 ? (n - s.min) / range : 0;
    }
    return out;
  });
};

// ✅ Preprocess uploaded data
const preprocessBatchData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();

    let rawData = [];

    // Parse based on file type
    if (fileExt === ".csv" || fileExt === ".txt") {
      const csvFile = fs.readFileSync(filePath, "utf8");
      const parsed = Papa.parse(csvFile, { header: true, skipEmptyLines: true });
      rawData = parsed.data;
    } else if (fileExt === ".xlsx" || fileExt === ".xls") {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else if (fileExt === ".json") {
      const jsonFile = fs.readFileSync(filePath, "utf8");
      rawData = JSON.parse(jsonFile);
    } else {
      console.error("[preprocess] Unsupported file type:", fileExt, req.file?.mimetype);
      return res.status(400).json({ error: "Unsupported file type" });
    }

    // ✅ Step 1: Trim strings and coerce simple types
    const trimmed = rawData.map((row) => {
      const out = {};
      for (const key in row) {
        let value = row[key];
        if (typeof value === "string") value = value.trim();
        out[key] = value;
      }
      return out;
    });

    // Read feature flags (multipart fields come as strings)
    const removeMissing = String(req.body.removeMissing ?? "true").toLowerCase() !== "false";
    const removeDuplicates = String(req.body.removeDuplicates ?? "true").toLowerCase() !== "false";
    const normalize = String(req.body.normalize ?? "true").toLowerCase() !== "false";

    // ✅ Step 2: Optionally remove rows with missing values in any column
    const noMissing = removeMissing
      ? trimmed.filter((row) => {
          for (const key in row) {
            if (isMissing(row[key])) return false;
          }
          return true;
        })
      : trimmed;

    // ✅ Step 3: Optionally remove duplicate rows
    const unique = removeDuplicates
      ? (() => {
          const seen = new Set();
          const out = [];
          for (const row of noMissing) {
            const canonical = JSON.stringify(
              Object.keys(row)
                .sort()
                .reduce((acc, k) => {
                  acc[k] = row[k];
                  return acc;
                }, {})
            );
            if (!seen.has(canonical)) {
              seen.add(canonical);
              out.push(row);
            }
          }
          return out;
        })()
      : noMissing;

    // ✅ Step 4: Optionally normalize numeric columns (min-max)
    const normalized = normalize ? normalizeNumericColumns(unique) : unique;

    // Store in memory
    processedDataStore = normalized;
    lastRun = { at: new Date().toISOString(), rows: normalized.length, file: req.file.originalname };
    approvalState = { approved: false, approvedAt: null, approvedBy: null };
    addLog({ type: "preprocess", message: "Preprocess completed", rows: normalized.length, file: req.file.originalname });

    // Delete uploaded file
    fs.unlinkSync(filePath);

    res.json(normalized);
  } catch (error) {
    console.error("Data preprocessing error:", error);
    res.status(500).json({ error: "Failed to preprocess data" });
  }
};

// ✅ Export as PDF
const exportPDF = (req, res) => {
  try {
    const doc = new PDFDocument();
    const filename = `processed_data_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res);

    doc.fontSize(18).text("Data Preprocessing Report", { align: "center" });
    doc.moveDown();

    processedDataStore.forEach((row, i) => {
      doc.fontSize(10).text(`Row ${i + 1}: ${JSON.stringify(row)}`);
      doc.moveDown(0.5);
    });

    doc.end();
  } catch (error) {
    console.error("PDF export error:", error);
    res.status(500).json({ error: "Failed to export PDF" });
  }
};

// ✅ Export as Excel
const exportExcel = (req, res) => {
  try {
    const ws = xlsx.utils.json_to_sheet(processedDataStore);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Processed Data");

    const filename = `processed_data_${Date.now()}.xlsx`;
    const filePath = path.join(__dirname, "../uploads", filename);

    xlsx.writeFile(wb, filePath);

    res.download(filePath, filename, (err) => {
      if (err) console.error(err);
      fs.unlinkSync(filePath); // Delete after download
    });
  } catch (error) {
    console.error("Excel export error", error);
    res.status(500).json({ error: "Failed to export Excel" });
  }
};

// ✅ Get processed data
const getProcessedData = (req, res) => {
  res.json(processedDataStore);
};

const getControlStatus = (req, res) => {
  res.json({
    processedRows: processedDataStore.length,
    approval: approvalState,
    lastRun,
    logCount: processingLog.length,
  });
};

const getProcessingLogs = (req, res) => {
  res.json(processingLog);
};

const approveProcessedData = (req, res) => {
  if (!processedDataStore.length) {
    return res.status(400).json({ error: "No processed data to approve" });
  }
  approvalState = { approved: true, approvedAt: new Date().toISOString(), approvedBy: req.body?.approvedBy || "admin" };
  addLog({ type: "approve", message: "Processed data approved", approvedBy: approvalState.approvedBy });
  res.json({ message: "Processed data approved", approval: approvalState });
};

const resetPreprocessing = (req, res) => {
  processedDataStore = [];
  approvalState = { approved: false, approvedAt: null, approvedBy: null };
  lastRun = null;
  addLog({ type: "reset", message: "Preprocessing reset" });
  res.json({ message: "Preprocessing state reset" });
};

const triggerPreprocessing = (req, res) => {
  const note = req.body?.note || "Manual trigger";
  addLog({ type: "trigger", message: note });
  res.json({ message: "Preprocessing trigger recorded", note });
};

module.exports = {
  upload,
  preprocessBatchData,
  exportPDF,
  exportExcel,
  getProcessedData,
  getControlStatus,
  getProcessingLogs,
  approveProcessedData,
  resetPreprocessing,
  triggerPreprocessing,
};
