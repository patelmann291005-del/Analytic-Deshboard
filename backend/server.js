const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");

// Routes
const salesRoutes = require("./routes/salesRoutes");
const dataRoutes = require("./routes/dataRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const csvAnalyticsRoutes = require("./routes/csvAnalyticsRoutes");
const apiDataRoutes = require("./routes/apiDataRoutes");
const authRoutes = require("./routes/authRoutes");
const dataPreprocessingRoutes = require("./routes/dataPreprocessingRoutes");
const dataCleaningRoutes = require("./routes/dataCleaningRoutes");
const reportRoutes = require("./routes/reportRoutes");
const aiModelRoutes = require("./routes/aiModelRoutes");
const User = require("./models/User");
const bcrypt = require("bcryptjs");


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes (more specific routes first)
app.use("/api/data-cleaning", dataCleaningRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/kpis", require("./routes/kpiRoutes"));
app.use("/api/reports", reportRoutes);
app.use("/api/ai-models", aiModelRoutes);
app.use("/api", csvAnalyticsRoutes);
app.use("/api", apiDataRoutes);
app.use("/api", salesRoutes);




// Connect DB then start server
connectDB().then(async () => {
  // Ensure a default admin exists with known credentials
  const adminEmail = "admin@gmail.com";
  const adminPassword = "admin123";

  let adminUser = await User.findOne({ email: adminEmail });
  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

  if (!adminUser) {
    adminUser = await User.create({
      name: "Admin",
      email: adminEmail,
      password: hashedAdminPassword,
    });
  } else {
    const matches = await bcrypt.compare(adminPassword, adminUser.password);
    if (!matches) {
      adminUser.password = hashedAdminPassword;
      await adminUser.save();
    }
  }

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Backend running locally on port ${PORT}`);
  });
}).catch((err) => {
  console.error("Failed to connect DB", err);
});
