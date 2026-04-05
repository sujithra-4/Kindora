const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
  {
    donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    description: String,
    foodType: { type: String, enum: ["veg", "non-veg"], required: true },
    quantity: { type: Number, required: true },
    cookedTime: { type: Date, required: true },
    expiryTime: { type: Date, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true, index: "2dsphere" }
    },
    imageUrl: String,
    address: String,
    status: {
      type: String,
      enum: ["available", "accepted", "picked", "delivered", "cancelled"],
      default: "available"
    }
  },
  { timestamps: true }
);

donationSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Donation", donationSchema);
