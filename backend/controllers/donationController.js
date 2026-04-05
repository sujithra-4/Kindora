const Donation = require("../models/Donation");

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function notifyNearbyNgos(io, donation) {
  const [donLng, donLat] = donation.location.coordinates;
  const sockets = await io.fetchSockets();
  sockets.forEach(socket => {
    const client = socket.data.client;
    if (!client || client.role !== "ngo") return;
    const ngoLat = Number(client.lat);
    const ngoLng = Number(client.lng);
    if (!Number.isFinite(ngoLat) || !Number.isFinite(ngoLng)) return;
    const distanceKm = haversineKm(donLat, donLng, ngoLat, ngoLng);
    if (distanceKm <= 20) {
      socket.emit("nearbyDonationCreated", {
        donationId: donation._id,
        title: donation.title,
        distanceKm: Number(distanceKm.toFixed(2)),
        address: donation.address || "Unknown address"
      });
    }
  });
}

async function notifyAllNgos(io, donation) {
  const sockets = await io.fetchSockets();
  sockets.forEach(socket => {
    const client = socket.data.client;
    if (!client || client.role !== "ngo") return;

    socket.emit("donationPostedForNgo", {
      donationId: donation._id,
      title: donation.title,
      address: donation.address || "Unknown address",
      quantity: donation.quantity,
      foodType: donation.foodType,
      expiryTime: donation.expiryTime
    });
  });
}

exports.createDonation = async (req, res) => {
  const { title, foodType, quantity, cookedTime, expiryTime, latitude, longitude, description, address } =
    req.body;
  if (!title || !foodType || !quantity || !cookedTime || !expiryTime || !latitude || !longitude) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  const donation = await Donation.create({
    donor: req.user._id,
    title,
    foodType,
    quantity,
    cookedTime,
    expiryTime,
    description,
    address,
    imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
    location: { type: "Point", coordinates: [Number(longitude), Number(latitude)] }
  });

  req.app.get("io").emit("newDonation", donation);
  await notifyAllNgos(req.app.get("io"), donation);
  await notifyNearbyNgos(req.app.get("io"), donation);
  return res.status(201).json(donation);
};

exports.getNearbyDonations = async (req, res) => {
  const { lat, lng, maxDistanceKm = 20 } = req.query;
  if (!lat || !lng) return res.status(400).json({ message: "lat and lng required" });

  const list = await Donation.find({
    status: "available",
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(maxDistanceKm) * 1000
      }
    }
  }).populate("donor", "name phone");

  const now = Date.now();
  const out = list
    .map(d => {
      const [dlng, dlat] = d.location.coordinates;
      const distance = haversineKm(Number(lat), Number(lng), dlat, dlng);
      const timeLeftHrs = Math.max(0, (new Date(d.expiryTime).getTime() - now) / 3600000);
      return { ...d.toObject(), distanceKm: distance, priority: timeLeftHrs + distance };
    })
    .sort((a, b) => a.priority - b.priority);

  return res.json(out);
};

exports.listPublicAvailable = async (_req, res) => {
  const now = new Date();
  const list = await Donation.find({
    status: "available",
    expiryTime: { $gt: now }
  })
    .select("title foodType quantity expiryTime address createdAt")
    .sort({ createdAt: -1 })
    .limit(6);

  return res.json(list);
};

exports.acceptDonation = async (req, res) => {
  const donation = await Donation.findById(req.params.id);
  if (!donation) return res.status(404).json({ message: "Donation not found" });
  if (donation.status !== "available") return res.status(400).json({ message: "Not available" });
  donation.status = "accepted";
  donation.acceptedBy = req.user._id;
  await donation.save();
  req.app.get("io").emit("donationUpdated", donation);
  return res.json(donation);
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  const donation = await Donation.findById(req.params.id);
  if (!donation) return res.status(404).json({ message: "Donation not found" });
  const flow = {
    available: ["accepted", "cancelled"],
    accepted: ["picked", "cancelled"],
    picked: ["delivered"],
    delivered: [],
    cancelled: []
  };
  if (!flow[donation.status].includes(status)) {
    return res.status(400).json({ message: `Invalid transition ${donation.status} -> ${status}` });
  }
  donation.status = status;
  await donation.save();
  req.app.get("io").emit("donationUpdated", donation);
  return res.json(donation);
};

exports.getMine = async (req, res) => {
  const q = req.user.role === "donor" ? { donor: req.user._id } : { acceptedBy: req.user._id };
  const list = await Donation.find(q).sort({ createdAt: -1 });
  return res.json(list);
};

exports.getById = async (req, res) => {
  const donation = await Donation.findById(req.params.id).populate("donor", "name").populate("acceptedBy", "name");
  if (!donation) return res.status(404).json({ message: "Donation not found" });
  return res.json(donation);
};
