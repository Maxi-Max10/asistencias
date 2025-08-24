const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

module.exports = {
  port: process.env.PORT || 4000,
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "*")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean),
};
