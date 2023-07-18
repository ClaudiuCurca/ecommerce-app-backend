const express = require("express");
const router = express.Router();

const userController = require("./../controllers/userController");

router.post("/signup", userController.signup);
router.post("/login", userController.login);

router.post("/forgotPassword", userController.forgotPassword);
router.patch("/resetPassword/:token", userController.resetPassword);

// unrestricted routes
router.route("/user/:userId").get(userController.getUser);

// user routes
router.use(userController.verifyIsLoggedIn);
router.get("/getMyInfo", userController.getMyInfo);

router.patch("/updateMyPassword", userController.updateMyPassword);

router.patch(
  "/updateMyInfo",
  userController.uploadUserPhoto,
  // userController.resizeUserPhoto,
  userController.updateMyInfo
);

router.patch("/addaddress", userController.addAdress);

router.delete("/deleteaddress/:addressId", userController.deleteAddress);

router.delete("/deleteMe", userController.deleteMe);

// admin routes
router.use(userController.verifyIsAdmin);
router.get("/admin/:userId", userController.adminGetUser);
router.delete("/admin/:userId/delete", userController.adminDeleteUser);

router.route("/").get(userController.getAllUsers);

module.exports = router;
