const mongoose = require("mongoose");

const connectDB = () => {
  const connect = mongoose.connect(process.env.DATABASE_URL);
  mongoose.connection.on("connected", () => {
    console.log("Database is connected.")
  });
  return connect;
};

module.exports = connectDB;