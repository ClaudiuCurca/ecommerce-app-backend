const AppError = require("../utils/appError");
const Category = require("./../models/CategoryModel");

exports.getAllCategories = async (req, res, next) => {
  try {
    let select = "-__v";
    if (req.query.select === "name,description") {
      select = "name description";
    }
    console.log(select);

    const maxResults = await Category.countDocuments();
    const query = Category.find().select(select);

    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query.sort(sortBy);
    } else {
      query.sort("name");
    }

    const categories = await query;

    res.status(200).json({
      status: "success",
      data: categories,
      maxResults,
    });
  } catch (err) {
    next(err);
  }
};

exports.getCategory = async (req, res, next) => {
  try {
    const category = await Category.find({
      name: req.params.categoryName,
    }).select("-__v");

    console.log(category);

    if (!category) {
      return next(new AppError("Category not found", 404));
    }

    res.status(200).json({
      status: "success",
      data: category,
    });
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const category = new Category();
    const { name, description, attrs } = req.body;
    category.name = name;
    category.description = description;
    category.attrs = attrs;

    await category.save();
    res.status(201).json({
      stauts: "success",
      data: category._id,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.categoryId,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!category) {
      return next(new AppError("Category not found", 404));
    }

    res.status(201).json({
      stauts: "success",
      data: category,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.categoryId);

    if (!category) {
      return next(new AppError("No category found with that ID", 404));
    }

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};
