const mongoose = require("mongoose");

const orderSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Order must belong to a user."],
    },
    items: {
      type: [
        {
          productId: {
            type: mongoose.Schema.ObjectId,
            ref: "Product",
            required: [true, "Order item must contain a product."],
          },
          quantity: {
            type: Number,
            required: [true, "Order item must have a quantity."],
            min: [1, "Quantity must be at least 1."],
          },
          name: { type: String, required: true },
          price: { type: Number, required: true },
          image: String,
        },
      ],
      validate: {
        validator: function (cartItems) {
          return cartItems.length > 0;
        },
        message: "Order must contain at least one product.",
      },
    },
    totalPrice: {
      type: Number,
      required: [true, "An order must have a total price"],
    },
    totalQuantity: {
      type: Number,
      required: [true, "An order must have a total number of items"],
    },
    isPaid: {
      type: Boolean,
      required: true,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "cashAtDelivery"],
      required: [true, "An order must have a payment method"],
    },
    status: {
      type: String,
      enum: ["confirmed", "transit", "fullfilled"],
      required: [true, "An order must have a status"],
      default: "confirmed",
    },
    isDelivered: {
      type: Boolean,
      required: true,
      default: false,
    },
    deliveredAt: {
      type: Date,
    },
    deliveryAddress: {
      contactName: { type: String, required: true },
      contactPhoneNumber: { type: String, required: true },
      deliveryLocation: { type: String, required: true },
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
