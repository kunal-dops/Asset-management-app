const Category = require("../models/Category");

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({}, "-__v").lean();
    res.json(categories.map(({ _id, ...c }) => ({ category_id: _id, ...c })));
  } catch (err) {
    console.error("GET CATEGORIES ERROR:", err);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

exports.addCategory = async (req, res) => {
  const categoryName = String(req.body.category_name || "").trim();
  const description = req.body.description ? String(req.body.description).trim() : null;

  if (!categoryName) {
    return res.status(400).json({ error: "category_name is required" });
  }

  try {
    await Category.create({ category_name: categoryName, description });
    res.status(201).json({ message: "Category added successfully" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Category already exists" });
    }
    console.error("ADD CATEGORY ERROR:", err);
    res.status(500).json({ error: "Failed to add category" });
  }
};

exports.deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await Category.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ message: "Category deleted successfully" });
  } catch (err) {
    if (err.name === "CastError") {
      return res.status(400).json({ error: "Invalid category id" });
    }
    console.error("DELETE CATEGORY ERROR:", err);
    res.status(500).json({ error: "Failed to delete category" });
  }
};
