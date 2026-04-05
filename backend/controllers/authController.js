const jwt = require("jsonwebtoken");
const User = require("../models/User");

function tokenFor(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

function serializeUser(user) {
  const [longitude, latitude] = user.location?.coordinates || [];

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    location:
      Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { latitude, longitude }
        : null
  };
}

exports.register = async (req, res) => {
  const { name, email, password, role, latitude, longitude, phone, address } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: "Email already exists" });

  const user = await User.create({
    name,
    email,
    password,
    role,
    phone,
    address,
    location:
      latitude && longitude
        ? { type: "Point", coordinates: [Number(longitude), Number(latitude)] }
        : undefined
  });

  return res.status(201).json({
    token: tokenFor(user._id),
    user: serializeUser(user)
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.matchPassword(password))) {
    return res.status(400).json({ message: "Invalid credentials" });
  }
  return res.json({
    token: tokenFor(user._id),
    user: serializeUser(user)
  });
};
