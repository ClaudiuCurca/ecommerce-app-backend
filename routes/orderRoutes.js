const express = require("express");
const router = express.Router();

const userController = require("./../controllers/userController");
const orderController = require("./../controllers/orderController");

router.use(userController.verifyIsLoggedIn);
// user routes
router.post("/createOrder", orderController.createOrder);

// shared admin and user routes
router.get("/:orderId", orderController.getOrder);

router.get("/user/:userId", orderController.getUserOrders);

router.delete("/:orderId", orderController.deleteOrder);

router.patch(
  "/:orderId/updateDeliveryAddress",
  orderController.updateOrderDeliveryAddress
);

// admin routes
router.use(userController.verifyIsAdmin);

router.get("/", orderController.getAllOrders);

router.patch("/:orderId/updateOrderToPaid", orderController.updateOrderToPaid);

router.patch(
  "/:orderId/updateOrderToDelivered",
  orderController.updateOrderToDelivered
);

router.patch(
  "/:orderId/updateOrderToTransit",
  orderController.updateOrderToTransit
);

module.exports = router;
