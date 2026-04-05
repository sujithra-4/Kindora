const express = require("express");
const { protect, requireRole } = require("../middleware/auth");
const upload = require("../middleware/upload");
const ctrl = require("../controllers/donationController");

const router = express.Router();

router.post("/", protect, requireRole("donor"), upload.single("image"), ctrl.createDonation);
router.get("/public", ctrl.listPublicAvailable);
router.get("/nearby", protect, requireRole("ngo"), ctrl.getNearbyDonations);
router.get("/mine", protect, ctrl.getMine);
router.get("/:id", protect, ctrl.getById);
router.post("/:id/accept", protect, requireRole("ngo"), ctrl.acceptDonation);
router.put("/:id/status", protect, ctrl.updateStatus);

module.exports = router;
