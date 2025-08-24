const express = require("express");
const dayjs = require("dayjs");
const router = express.Router();
const db = require("../db");

// Normaliza documento: quita separadores y pone mayúsculas
const normDoc = (s="") => String(s).replace(/[^0-9a-z]/gi, "").toUpperCase();

router.post("/", (req, res, next) => {
  try {
    let { workerId, doc, status, date, notes, crewId = 1 } = req.body || {};

    if (!status) return res.status(400).json({ error: "status requerido" });

    if (!workerId && doc) {
      const ndoc = normDoc(doc);
      let w = db.prepare("SELECT id FROM workers WHERE doc=?").get(ndoc);
      if (!w) {
        const info = db.prepare(
          "INSERT INTO workers (crew_id, fullname, doc) VALUES (?,?,?)"
        ).run(crewId, ndoc, ndoc); // fullname = doc normalizado
        workerId = info.lastInsertRowid;
      } else {
        workerId = w.id;
      }
    }
    if (!workerId) return res.status(400).json({ error: "workerId o doc requerido" });

    const theDate = date || dayjs().format("YYYY-MM-DD");
    db.prepare(`
      INSERT INTO attendance (worker_id, date, status, notes)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(worker_id, date)
      DO UPDATE SET status=excluded.status, notes=excluded.notes
    `).run(workerId, theDate, status, notes || null);

    res.json({ ok: true, workerId, date: theDate, status });
  } catch (e) { next(e); }
});

router.post("/bulk", (req, res, next) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: "items vacio" });

    const up = db.prepare(`
      INSERT INTO attendance (worker_id, date, status, notes)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(worker_id, date)
      DO UPDATE SET status=excluded.status, notes=excluded.notes
    `);
    const findByDoc = db.prepare("SELECT id FROM workers WHERE doc=?");
    const createByDoc = db.prepare("INSERT INTO workers (crew_id, fullname, doc) VALUES (?,?,?)");

    let ok = 0;
    for (const it of items) {
      if (!it) continue;
      let { workerId, doc, status, date, notes } = it;
      if (!status) continue;

      if (!workerId && doc) {
        const ndoc = normDoc(doc);
        let w = findByDoc.get(ndoc);
        if (!w) {
          const info = createByDoc.run(1, ndoc, ndoc);
          workerId = info.lastInsertRowid;
        } else {
          workerId = w.id;
        }
      }
      if (!workerId) continue;

      const d = date || dayjs().format("YYYY-MM-DD");
      up.run(workerId, d, status, notes || null);
      ok++;
    }
    res.json({ ok, total: items.length });
  } catch (e) { next(e); }
});

router.get("/today", (req, res, next) => {
  try {
    const d = req.query.date || dayjs().format("YYYY-MM-DD");
    const rows = db.prepare(`
      SELECT a.id, a.date, a.status, w.fullname, IFNULL(w.doc,'') AS doc
      FROM attendance a
      JOIN workers w ON w.id = a.worker_id
      WHERE a.date = ?
      ORDER BY w.fullname
    `).all(d);
    res.json(rows);
  } catch (e) { next(e); }
});

router.get("/export.csv", (req, res, next) => {
  try {
    const d = req.query.date || dayjs().format("YYYY-MM-DD");
    const rows = db.prepare(`
      SELECT IFNULL(w.doc,'') AS doc, a.date, a.status, IFNULL(a.notes,'') notes
      FROM attendance a
      JOIN workers w ON w.id = a.worker_id
      WHERE a.date = ?
      ORDER BY w.fullname
    `).all(d);

    const header = "doc,date,status,notes";
    const csv = [header, ...rows.map(r =>
      [r.doc, r.date, r.status, `"${(r.notes||"").replace(/"/g,'""')}"`].join(",")
    )].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="attendance-${d}.csv"`);
    res.send(csv);
  } catch (e) { next(e); }
});

// DELETE /api/attendance/:id  -> borra un registro puntual de asistencia
router.delete("/:id", (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "bad_id" });
    const info = db.prepare("DELETE FROM attendance WHERE id=?").run(id);
    res.json({ ok: info.changes > 0 });
  } catch (e) { next(e); }
});


module.exports = router;
