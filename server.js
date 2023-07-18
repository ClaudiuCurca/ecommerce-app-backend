const dotenv = require("dotenv");
const connectToDatabase = require("./config/db");

dotenv.config({ path: "./config.env" });

const app = require("./app");

connectToDatabase();

const port = process.env.PORT || 8000;

const server = app.listen(port, () => {
  console.log(`listening on port ${port}`);
});

if (process.env.NODE_ENV === "development") {
  process.on("uncaughtException", (err) => {
    console.log("UNCAUGHT EXCEPTION! Shutting down...");
    console.log(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });

  process.on("unhandledRejection", (err) => {
    console.log("unhandledRejection! Shutting down...");
    console.log(err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });
}
