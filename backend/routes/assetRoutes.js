// assetRoutes.js
const express = require("express");
const router = express.Router();
const assetController = require("../controllers/assetController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, assetController.getAssets);
router.post("/", authMiddleware, requireRole("admin", "technician"), assetController.addAsset);
router.put("/:id", authMiddleware, requireRole("admin", "technician"), assetController.updateAsset);
router.delete("/:id", authMiddleware, requireRole("admin"), assetController.deleteAsset);

module.exports = router;
