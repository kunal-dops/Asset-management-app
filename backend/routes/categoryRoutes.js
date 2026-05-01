const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const requireRole = require("../middleware/roleMiddleware");

router.get("/", categoryController.getCategories);
router.post("/", requireRole("admin", "technician"), categoryController.addCategory);
router.delete("/:id", requireRole("admin"), categoryController.deleteCategory);

module.exports = router;
