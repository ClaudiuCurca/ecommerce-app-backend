const mongoose = require("mongoose");

const categorySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "A category must have a name"],
      unique: true,
    },
    description: {
      type: String,
      required: [true, "A category must have a description"],
    },
    attrs: [{ key: { type: String }, value: [{ type: String }] }],
    image: String,
  },
  {
    timestamps: true,
  }
);

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
