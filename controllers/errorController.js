const AppError = require("../utils/appError");

const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errors: err.errors,
    });
  } else {
    res.status(500).json({
      status: "error",
      message: "Something went wrong",
    });
  }
};

const handleDuplicateFieldsErrorDB = (err) => {
  message = "Duplicate field";
  const duplicateField = Object.keys(err.keyValue)[0];
  errors = [
    {
      field: duplicateField,
      message: `${duplicateField} is already used`,
    },
  ];
  return new AppError(message, 400, errors);
};

const handleValidationErrorDB = (err) => {
  const message = `Invalid input data`;
  const errors = Object.values(err.errors).map((key) => {
    return { field: key.path, message: key.message };
  });

  return new AppError(message, 400, errors);
};

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path} :${err.value}`;
  return new AppError(message, 400);
};

const handleJWTError = (err) =>
  new AppError("Invalid Token. Please log in again", 400);

const handleJWTExpiredError = (err) =>
  new AppError("Token expired. Please log in again", 400);

module.exports = (err, req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err, name: err.name, message: err.message };

    if (error.code === 11000) {
      error = handleDuplicateFieldsErrorDB(error);
    }
    if (error.name === "ValidationError") {
      error = handleValidationErrorDB(error);
    }
    if (error.name === "CastError") {
      error = handleCastErrorDB(error);
    }
    if (error.name === "JsonWebTokenError") {
      error = handleJWTError(error);
    }
    if (error.name === "TokenExpiredError") {
      error = handleJWTExpiredError(error);
    }

    sendErrorProd(error, res);
  }
};
