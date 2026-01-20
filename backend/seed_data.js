const mongoose = require("mongoose");
require("dotenv").config();
const Sales = require("./models/Sales");

const seedData = [
  {
    date: "2025-02-01",
    product: "Mobile",
    quantity: 10,
    revenue: 150000
  },
  {
    date: "2025-02-02",
    product: "Laptop",
    quantity: 5,
    revenue: 250000
  },
  {
    date: "2025-02-03",
    product: "Headphones",
    quantity: 20,
    revenue: 40000
  }
];

async function seedDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    //await Sales.deleteMany(); // optional: clear old data
    await Sales.insertMany(seedData);

    console.log("Data seeded successfully");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seedDB();
