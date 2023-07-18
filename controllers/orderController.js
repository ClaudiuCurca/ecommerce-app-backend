const Order = require("./../models/OrderModel");
const AppError = require("../utils/appError");
const Product = require("./../models/ProductModel");
const isAuthorized = require("./../utils/isAuthorized");

exports.getAllOrders = async (req, res, next) => {
  try {
    let query = Order.find();

    const maxResults = await Order.countDocuments();

    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query.sort(sortBy);
    } else {
      query.sort("-createdAt");
    }

    // Pagination
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 16;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    if (req.query.page) {
      const numOrders = await Order.countDocuments();
      if (skip > numOrders) {
        next(new AppError("This page does not exist", 404));
      }
    }

    const orders = await query;
    console.log(orders);

    res.status(200).json({
      status: "success",
      data: orders,
      maxResults,
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.params.userId });

    // must be an admin or the owner of the orders to fetch them
    if (
      req.user.isAdmin === false &&
      req.user._id.toString() !== req.params.userId.toString()
    ) {
      return next(new AppError("You are not authorized", 401));
    }

    console.log(orders);

    if (!orders) {
      return next(new AppError("The user with this id does not exist.", 404));
    }

    res.status(200).json({
      status: "success",
      data: orders,
    });
  } catch (err) {
    next(err);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { cartItems, paymentMethod, deliveryAddress } = req.body;
    //cartItems should look like this : [{proudctId: asdfaf, productQuantity: 2},{proudctId: sdger, productQuantity: 5}]

    let order = {
      totalPrice: 0,
      totalQuantity: 0,
      items: [],
    };

    order.paymentMethod = paymentMethod;

    // check if all the products in cartItems exist in the database
    const productIds = cartItems.map((cartItem) => cartItem.productId);
    console.log(productIds);
    const products = await Product.find({ _id: { $in: productIds } });
    if (cartItems.length !== products.length) {
      return next(
        new AppError(
          "Some cart items were not found in the products database.",
          400
        )
      );
    }

    //check if there is enough stock for each product in the order
    let notEnoughStock = false;
    cartItems.forEach((cartItem) => {
      const product = products.find((p) => p._id.equals(cartItem.productId));
      if (product.count < cartItem.productQuantity) {
        notEnoughStock = true;
      }
    });

    if (notEnoughStock) {
      return next(
        new AppError(
          `There is not enough stock for a product from the order`,
          400
        )
      );
    }

    //required logic for each product : update sales and count
    cartItems.forEach(async (cartItem) => {
      const product = products.find((p) => p._id.equals(cartItem.productId));
      product.count -= cartItem.productQuantity;
      product.sales += cartItem.productQuantity;

      order.items.push({
        productId: cartItem.productId,
        quantity: cartItem.productQuantity,
        name: product.name,
        price: product.price,
        image: product.imageCover,
      });

      order.totalPrice += cartItem.productQuantity * product.price; // to make sure the price is correct
      order.totalQuantity += cartItem.productQuantity;
      await product.save();
    });

    // delivery address is taken from req.user.deliveryAddresses
    order.deliveryAddress = deliveryAddress;

    order.user = req.user._id;

    const createdOrder = await Order.create(order);

    res.status(200).json({
      status: "success",
      data: createdOrder,
    });
  } catch (err) {
    next(err);
  }
};

exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return next(new AppError("This order does not exist", 404));
    }

    if (isAuthorized(req.user, order.user) === false) {
      return next(
        new AppError("You do not have permission to perform this action.", 401)
      );
    }

    res.status(200).json({
      status: "success",
      data: order,
    });
  } catch (err) {
    next(err);
  }
};

// some things can be changed by the order's owner too if the order is not in transit
const updateOrder = function (fieldToUpdate) {
  return async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.orderId);

      if (!order) {
        return next(new AppError("This order does not exist", 404));
      }

      if (fieldToUpdate === "paid") {
        order.isPaid = true;
        order.paidAt = new Date();
      } else if (fieldToUpdate === "delivered") {
        order.isDelivered = true;
        order.deliveredAt = new Date();
        order.status = "fullfilled";
      } else if (fieldToUpdate === "deliveryAddress") {
        if (order.status !== "confirmed") {
          return next(
            new AppError(
              "It is too late to update the delivery address, the order is already in transit",
              400
            )
          );
        }
        if (isAuthorized(req.user, order.user) === false) {
          return next(
            new AppError(
              "You do not have permission to perform this action.",
              401
            )
          );
        }
        order.deliveryAddress = {
          contactName: req.body.contactName,
          contactPhoneNumber: req.body.contactPhoneNumber,
          deliveryLocation: req.body.deliveryLocation,
        };
      } else if (fieldToUpdate === "transit") {
        order.status = "transit";
      }

      await order.save();

      res.status(200).json({
        status: "success",
        data: order,
      });
    } catch (err) {
      next(err);
    }
  };
};

exports.updateOrderToPaid = updateOrder("paid");
exports.updateOrderToTransit = updateOrder("transit");
exports.updateOrderToDelivered = updateOrder("delivered");
exports.updateOrderDeliveryAddress = updateOrder("deliveryAddress");

exports.deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return next(new AppError("This order does not exist", 404));
    }

    if (order.status !== "confirmed") {
      return next(
        new AppError(
          "It's to late to cancel the order as it is already in transit",
          400
        )
      );
    }

    if (isAuthorized(req.user, order.user) === false) {
      return next(
        new AppError("You do not have permission to perform this action.", 401)
      );
    }

    await order.deleteOne();

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};
