const express = require("express");
const db = require("../db");

const router = express.Router();

// GET /api/crews -> list all crews
router.get("/", (_req, res, next) => {
  try {
    const rows = db.prepare("SELECT id, name FROM crews ORDER BY id").all();
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
