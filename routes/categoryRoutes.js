const express = require("express");
const router = express.Router();

const categoryController = require("./../controllers/categoryController");
const userController = require("./../controllers/userController");

// unrestricted routes
router.get("/", categoryController.getAllCategories);

router.get("/:categoryName", categoryController.getCategory);

// admin routes
router.use(userController.verifyIsLoggedIn, userController.verifyIsAdmin);

router.post("/", categoryController.createCategory);

router
  .route("/:categoryId")
  .patch(categoryController.updateCategory)
  .delete(categoryController.deleteCategory);

module.exports = router;
