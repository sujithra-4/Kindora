const mongoose = require("mongoose");

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    await conn.connection.collection("donations").createIndex({ location: "2dsphere" });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("Mongo connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
