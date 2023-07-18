const dotenv = require("dotenv");
const mongoose = require("mongoose");
dotenv.config({ path: "./config.env" });

const DB = process.env.MONGODB.replace(
  "<password>",
  process.env.MONGODB_PASSWORD
);

function connectToDatabase(req, res, next) {
  try {
    mongoose.connect(DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to database");
  } catch (err) {
    console.log(err);
  }
}

module.exports = connectToDatabase;
