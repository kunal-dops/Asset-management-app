const db = require("../config/db");

// Get categories
exports.getCategories = (req, res) => {
  db.query("SELECT * FROM categories", (err, result) => {
    if (err) {
      console.error("GET CATEGORIES ERROR:", err);
      return res.status(500).json({ error: "Failed to fetch categories" });
    }
    res.json(result);
  });
};

// Add category
exports.addCategory = (req, res) => {
  const categoryName = String(req.body.category_name || "").trim();
  const description = req.body.description ? String(req.body.description).trim() : null;

  if (!categoryName) {
    return res.status(400).json({ error: "category_name is required" });
  }

  db.query(
    "INSERT INTO categories (category_name, description) VALUES (?, ?)",
    [categoryName, description],
    (err, result) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ error: "Category already exists" });
        }
        console.error("ADD CATEGORY ERROR:", err);
        return res.status(500).json({ error: "Failed to add category" });
      }
      res.status(201).json({ message: "Category added successfully" });
    }
  );
};

// Delete category
exports.deleteCategory = (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM categories WHERE category_id = ?", [id], (err, result) => {
    if (err) {
      console.error("DELETE CATEGORY ERROR:", err);
      return res.status(500).json({ error: "Failed to delete category" });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.json({ message: "Category deleted successfully" });
  });
};
