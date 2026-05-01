const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

router.get("/", authMiddleware, userController.getUsers);
router.post("/", authMiddleware, requireRole("admin"), userController.addUser);
router.put("/:id", authMiddleware, requireRole("admin"), userController.updateUser);
router.delete("/:id", authMiddleware, requireRole("admin"), userController.deleteUser);

module.exports = router;
