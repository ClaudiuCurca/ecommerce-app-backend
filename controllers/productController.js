const Category = require("../models/CategoryModel");
const Review = require("../models/ReviewModel");
const AppError = require("../utils/appError");
const Product = require("./../models/ProductModel");
const checkAndUpdateAttributes = require("./../utils/checkAndUpdateAttributes");
const multer = require("multer");
const sharp = require("sharp");

const cloudinary = require("./../config");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "products",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [
      { width: 2000, height: 1333, fit: "limit", quality: "90" },
    ],
  },
});

const upload = multer({ storage: storage });

exports.uploadProductImages = upload.array("images");

exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new AppError("Product not found", 404));
    }
    res.status(200).json({
      status: "success",
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllProducts = async (req, res, next) => {
  try {
    //Filtering
    let queryObj = { ...req.query };
    const excludedFields = [
      "page",
      "sort",
      "limit",
      "fields",
      "attributes",
      "term",
    ];
    excludedFields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    queryObj = JSON.parse(queryStr);

    //Attributes
    if (req.query.attributes) {
      // RAM-15GB-16GB,color-red-black
      let attributes = req.query.attributes.split(",");
      attributes = attributes.map(
        (attributeTable) => attributeTable.split("-")
        // [ [ 'RAM', '15GB', '16GB' ], [ 'color', 'red', 'black' ] ]
      );

      let queryAttrs = [];
      for (let i = 0; i < attributes.length; i++) {
        queryAttrs.push({
          attrs: {
            $elemMatch: {
              key: attributes[i][0],
              value: { $in: [...attributes[i].slice(1)] },
            },
          },
        });
      }
      // console.log(queryAttrs);
      queryObj.$and = queryAttrs;
    }

    // search term
    if (req.query.term) {
      Object.assign(queryObj, {
        name: { $regex: req.query.term, $options: "i" },
      });
    }

    const maxResults = await Product.countDocuments(queryObj);
    let query = Product.find(queryObj);

    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query.sort(sortBy);
    } else {
      query.sort("rating");
    }

    //Field limiting
    query.select("-__v -updatedAt -reviews -images");

    // Pagination
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 16;
    const skip = (page - 1) * limit;

    query = query.skip(skip).limit(limit);

    if (req.query.page) {
      const numProducts = await Product.countDocuments();
      if (skip > numProducts) {
        next(new AppError("This page does not exist", 404));
      }
    }

    const products = await query;

    res.status(200).json({
      maxResults,
      results: products.length,
      status: "success",
      data: products,
    });
  } catch (err) {
    next(err);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const product = new Product();
    product.name = req.body.name;
    product.description = req.body.description;
    product.count = req.body.count;
    product.price = req.body.price;
    product.category = req.body.category;

    let attributes;
    if (typeof req.body.attributesTable === "string") {
      attributes = JSON.parse(req.body.attributesTable);
    } else {
      attributes = req.body.attributeTable;
    }
    product.attrs = attributes;

    if (req.files) {
      if (req.files.length > 0) {
        product.imageCover = req.files[req.files.length - 1].path;
        product.images = req.files
          .slice(0, req.files.length - 1)
          .map((file) => file.path);
      }
    }

    // Checking if category exists
    const category = await Category.findOne({ name: product.category });
    if (!category) {
      return next(new AppError("Category does not exist", 400));
    }

    console.log(product.attrs);

    // Checking if attributes and attributes' values exist in the category, if not we will add them automatically
    checkAndUpdateAttributes(product.attrs, category.attrs);

    await category.save();

    await product.save();

    res.status(201).json({
      status: "success",
      data: product._id,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    console.log(product);

    product.reviews.forEach(async (review) => {
      await Review.findByIdAndDelete(review.toString());
    });

    await product.deleteOne();

    // await Review.deleteMany();

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    product.name = req.body.name || product.name;
    product.description = req.body.description || product.description;
    product.category = req.body.category || product.category;
    product.count = req.body.count || product.count;
    product.price = req.body.price || product.price;

    if (req.files) {
      if (req.files.length > 0) {
        product.imageCover = req.files[req.files.length - 1].path;
        product.images = req.files
          .slice(0, req.files.length - 1)
          .map((file) => file.path);
      }
    }

    let attributes;
    if (typeof req.body.attributesTable === "string") {
      attributes = JSON.parse(req.body.attributesTable);
    } else {
      attributes = req.body.attributeTable;
    }
    product.attrs = attributes;

    // Checking if category exists
    const category = await Category.findOne({ name: product.category });
    if (!category) {
      return next(new AppError("Category does not exist", 400));
    }

    // Checking if attributes and attributes' values exist in the category, if not we will add them automatically
    checkAndUpdateAttributes(product.attrs, category.attrs);

    await category.save();
    await product.save();

    res.status(200).json({
      status: "success",
      data: product,
    });
  } catch (err) {
    next(err);
  }
};
