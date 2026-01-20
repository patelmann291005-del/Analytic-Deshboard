const axios = require("axios");
const crypto = require("crypto");
const ApiData = require("../models/ApiData");
const csv = require("csv-parser");
const fs = require("fs");

// FETCH FROM API & STORE AS BATCH
exports.fetchApiData = async (req, res) => {
  try {
    const batchId = crypto.randomUUID();

    // Example API (dummy data)
    const apiRes = await axios.get(
      "https://dummyjson.com/products?limit=10"
    );

    const records = apiRes.data.products.map(item => ({
      title: item.title,
      value: item.price * item.stock, // analytical value
      batchId,
      rawData: item
    }));

    await ApiData.insertMany(records);

    res.json({
      message: "API data fetched and stored",
      batchId,
      records: records.length
    });
  } catch (err) {
    console.error("API fetch error:", err);
    res.status(500).json({ message: "API fetch failed", error: err.message });
  }
};

// UPLOAD FILE & STORE AS BATCH
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const batchId = crypto.randomUUID();
    const filePath = req.file.path;
    const fileExt = req.file.originalname.split('.').pop().toLowerCase();
    let records = [];

    if (fileExt === 'json') {
      // Parse JSON file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);
      
      records = jsonData.map(item => ({
        title: item.title || item.name || 'Untitled',
        value: parseFloat(item.value) || 0,
        batchId,
        rawData: item
      }));
    } else if (fileExt === 'csv') {
      // Parse CSV file
      await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (data) => results.push(data))
          .on('end', () => {
            records = results.map(item => ({
              title: item.title || item.name || 'Untitled',
              value: parseFloat(item.value) || 0,
              batchId,
              rawData: item
            }));
            resolve();
          })
          .on('error', reject);
      });
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: "Unsupported file type" });
    }

    await ApiData.insertMany(records);
    fs.unlinkSync(filePath); // Clean up uploaded file

    res.json({
      message: "File uploaded and processed",
      batchId,
      records: records.length
    });
  } catch (err) {
    console.error("File upload error:", err);
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "File upload failed", error: err.message });
  }
};
