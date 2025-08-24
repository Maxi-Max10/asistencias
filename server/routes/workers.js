const express = require("express");
const router = express.Router();
const db = require("../db");
const normDoc = (s="") => String(s).replace(/[^0-9a-z]/gi, "").toUpperCase();

router.get("/", (req, res, next) => {
  try {
    const crewId = req.query.crewId || 1;
    const rows = db.prepare(
      "SELECT id, fullname, IFNULL(doc,'') AS doc FROM workers WHERE crew_id=? AND active=1 ORDER BY fullname"
    ).all(crewId);
    res.json(rows);
  } catch (e) { next(e); }
});

router.post("/", (req, res, next) => {
  try {
    const { crewId = 1, doc, fullname } = req.body || {};
    if (!doc) return res.status(400).json({ error: "doc requerido" });

    const ndoc = normDoc(doc);
    const byDoc = db.prepare("SELECT id, fullname, doc FROM workers WHERE doc=?").get(ndoc);
    if (byDoc) return res.json(byDoc);

    const name = (fullname && String(fullname).trim()) || ndoc;
    const info = db.prepare(
      "INSERT INTO workers (crew_id, fullname, doc) VALUES (?,?,?)"
    ).run(crewId, name, ndoc);

    res.json({ id: info.lastInsertRowid, fullname: name, doc: ndoc });
  } catch (e) { next(e); }
});

module.exports = router;
