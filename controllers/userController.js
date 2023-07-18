const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("./../models/UserModel");
const AppError = require("../utils/appError");
const sendEmail = require("../utils/email");
const crypto = require("crypto");
const multer = require("multer");
const sharp = require("sharp");
const Review = require("../models/ReviewModel");

const cloudinary = require("./../config");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Create the multer storage with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "users", // Optional: Set the folder name in Cloudinary
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 500, height: 500, fit: "limit", quality: "90" }],
  },
});

// Create the multer upload instance with the Cloudinary storage
const upload = multer({ storage: storage });

exports.uploadUserPhoto = upload.single("photo");

const signToken = (id) => {
  return jwt.sign(
    {
      id,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );
};

exports.verifyIsLoggedIn = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
      return next(new AppError("You are not logged in!", 401));
    }

    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(
        new AppError(
          "The user belonging to this token does no longer exist",
          401
        )
      );
    }

    if (user.changedPasswordAfter(decoded.iat)) {
      return next(
        new AppError("User recently changed password! Please log in again", 401)
      );
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

exports.verifyIsAdmin = async (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    return next(new AppError("You are not authorized to do this", 401));
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    // Get user based on email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return next(new AppError("There is no user with email address", 404));
    }

    // Generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // send it to user's email
    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/api/users/resetPassword/${resetToken}`;

    const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to :${resetURL}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Your password reset token (valid for 10 mins)",
        message,
      });

      res.status(200).json({
        status: "success",
        message: "Token sent to email",
      });
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return next(
        new AppError(
          "There was an error sending the email. Try again later.",
          500
        )
      );
    }
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    console.log(user);
    if (!user) {
      return next(new AppError("Token is invalid or has expired", 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    user.passwordChangedAt = Date.now();

    await user.save();

    const token = signToken(user._id);

    res.cookie("jwt", token, {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      secure: process.env.NODE_ENV === "production" ? true : false,
      httpOnly: true,
    });

    res.status(201).json({
      status: "success",
      token,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateMyPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.user._id }).select("+password");

    const { currentPassword, password, passwordConfirm } = req.body;

    if (!(await user.correctPassword(currentPassword, user.password))) {
      return next(new AppError("Current password is incorrect", 400));
    }

    user.password = password;
    user.passwordConfirm = passwordConfirm;

    await user.save();

    res.status(200).json({
      status: "success",
      message: "Your password has been updated",
    });
  } catch (err) {
    next(err);
  }
};

exports.getMyInfo = async (req, res, next) => {
  try {
    let user = await User.findOne({ _id: req.user._id });
    if (!user) {
      next(new AppError("User not found", 404));
    }

    // should have saved a ref to user reviews in the User model
    // but too far into dev so it might break too much
    let productsReviewed = await Review.find({ user: req.user._id }).select(
      "product"
    );
    console.log(productsReviewed);
    productsReviewed = productsReviewed.map((review) => review.product);

    res.status(200).json({
      status: "success",
      data: { user, productsReviewed },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateMyInfo = async (req, res, next) => {
  try {
    const allowedChangeableFields = ["name", "phoneNumber", "email"];
    const updateObj = {};

    Object.keys(req.body).forEach((el) => {
      if (allowedChangeableFields.includes(el)) updateObj[el] = req.body[el];
    });

    console.log(req.file);
    if (req.file) updateObj.photo = req.file.path;
    console.log(updateObj);
    const updatedUser = await User.findByIdAndUpdate(req.user._id, updateObj, {
      runValidators: true,
      new: true,
    });

    res.status(200).json({
      status: "success",
      data: updatedUser,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.addAdress = async (req, res, next) => {
  try {
    console.log(req.user);

    const savedAddresses = req.user.savedAddresses;
    savedAddresses.push({
      contactName: req.body.contactName,
      contactPhoneNumber: req.body.contactPhoneNumber,
      deliveryLocation: req.body.deliveryLocation,
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { savedAddresses },
      {
        runValidators: true,
        new: true,
      }
    );

    res.status(200).json({
      status: "success",
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteAddress = async (req, res, next) => {
  try {
    let savedAddresses = [...req.user.savedAddresses];

    savedAddresses = savedAddresses.filter(
      (address) => address._id.toString() !== req.params.addressId
    );

    // if nothing changes, then it means no address with the req.params.addressId was found
    if (req.user.savedAddresses.length === savedAddresses.length) {
      return next(new AppError("There is no saved address with this Id", 404));
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { savedAddresses },
      {
        runValidators: true,
        new: true,
      }
    );

    res.status(200).json({
      status: "success",
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteMe = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user._id);

    res.status(204).json();
  } catch (err) {
    next(err);
  }
};

exports.signup = async (req, res, next) => {
  try {
    const user = new User();
    user.name = req.body.name;
    user.email = req.body.email;
    user.photo = req.body.photo;
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordChangedAt = req.body.passwordChangedAt;
    await user.save();

    const token = signToken(user._id);

    res.cookie("jwt", token, {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      secure: process.env.NODE_ENV === "production" ? true : false,
      httpOnly: true,
    });

    res.status(201).json({
      status: "success",
      token,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400));
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.correctPassword(password, user.password))) {
      return next(new AppError("Incorrect email or password", 401));
    }

    const token = signToken(user._id);
    res.cookie("jwt", token, {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      secure: process.env.NODE_ENV === "production" ? true : false,
      httpOnly: true,
    });
    res.status(200).json({
      status: "success",
      token,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const query = User.find();

    const maxResults = await User.countDocuments();

    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query.sort(sortBy);
    } else {
      query.sort("rating");
    }

    const users = await query;

    res.status(200).json({
      status: "success",
      data: users,
      maxResults,
    });
  } catch (err) {
    next(err);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "-isAdmin -email -passwordChangedAt -savedAddresses -phoneNumber -__v"
    );
    if (!user) {
      return next(new AppError("This user does not exist", 404));
    }

    res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

exports.adminGetUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return next(new AppError("This user does not exist", 404));
    }

    res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

exports.adminDeleteUser = async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.userId);

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};
