const Donation = require("../models/Donation");
const User = require("../models/User");

exports.getStats = async (_req, res) => {
  const totalDonations = await Donation.countDocuments();
  const delivered = await Donation.find({ status: "delivered" });
  const peopleFed = delivered.reduce((sum, d) => sum + (d.quantity || 0), 0);
  const activeUsers = await User.countDocuments();

  return res.json({
    totalDonations,
    foodSaved: delivered.length,
    peopleFed,
    activeUsers
  });
};
