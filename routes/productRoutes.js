const express = require("express");
const router = express.Router();

const userController = require("./../controllers/userController");
const productController = require("./../controllers/productController");

// unrestricted routes
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProduct);

// admin routes
router.use(userController.verifyIsLoggedIn, userController.verifyIsAdmin);

router
  .route("/")
  .post(productController.uploadProductImages, productController.createProduct);

router
  .route("/:id")
  .delete(productController.deleteProduct)
  .patch(
    productController.uploadProductImages,
    productController.updateProduct
  );

module.exports = router;
