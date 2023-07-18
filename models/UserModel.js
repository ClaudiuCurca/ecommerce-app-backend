const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Review = require("./ReviewModel");

const addressSchema = mongoose.Schema({
  contactName: { type: String, required: true },
  contactPhoneNumber: { type: String, required: true },
  deliveryLocation: { type: String, required: true },
});

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A user must have a name"],
      unique: true,
    },
    email: {
      type: String,
      required: [true, "A user must have a email"],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    photo: { type: String },
    phoneNumber: String,
    savedAddresses: [addressSchema],
    password: {
      type: String,
      required: [true, "A user must have a password"],
      minlength: [8, "The password must have at least 8 characters"],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        // this only works on .create() and .save(), not on findbyidandupdate
        validator: function (el) {
          return el === this.password;
        },
        message: "Password confirm must match the password",
      },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);

  this.passwordConfirm = undefined;
});

userSchema.post("findOneAndDelete", async function (next) {
  const userId = this.getQuery()["_id"]; // Get the user ID from the query

  console.log(userId);
  try {
    await Review.deleteMany({ user: userId });
  } catch (error) {
    console.log(error);
  }
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    // check if the token has been issued before the password has been changed
    return JWTTimestamp < changedTimestamp;
  }

  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
