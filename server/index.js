const express = require("express");
const dayjs = require("dayjs");
const db = require("./db");

const router = express.Router();

/* ============ helpers ============ */

// crea (si no existe) un trabajador por doc + crewId
function upsertWorkerByDoc({ crewId, doc, fullname = null }) {
  if (!doc || !crewId) return null;

  const w = db.prepare(`SELECT * FROM workers WHERE doc = ?`).get(doc);
  if (w) {
    if (w.crew_id !== crewId) {
      db.prepare(`UPDATE workers SET crew_id = ? WHERE id = ?`).run(crewId, w.id);
      return { ...w, crew_id: crewId };
    }
    return w;
  }

  const name = fullname && fullname.trim() ? fullname.trim() : doc;
  const info = db
    .prepare(`INSERT INTO workers (crew_id, fullname, active, doc) VALUES (?, ?, 1, ?)`)
    .run(crewId, name, doc);
  return db.prepare(`SELECT * FROM workers WHERE id = ?`).get(info.lastInsertRowid);
}

function upsertAttendance({ workerId, status, notes = "" }) {
  const date = dayjs().format("YYYY-MM-DD");
  const existing = db
    .prepare(`SELECT id FROM attendance WHERE worker_id = ? AND date = ?`)
    .get(workerId, date);

  if (existing) {
    db.prepare(`UPDATE attendance SET status = ?, notes = ? WHERE id = ?`)
      .run(status, notes, existing.id);
    return existing.id;
  } else {
    const info = db
      .prepare(`INSERT INTO attendance (worker_id, date, status, notes) VALUES (?, ?, ?, ?)`)
      .run(workerId, date, status, notes);
    return info.lastInsertRowid;
  }
}

/* ============ rutas ============ */

// POST /api/attendance   { crewId, doc, status, fullname? }
router.post("/", (req, res, next) => {
  try {
    const { crewId, doc, status, fullname } = req.body || {};
    if (!crewId || !doc || !status) {
      return res.status(400).json({ error: "crewId, doc y status son requeridos" });
    }
    const worker = upsertWorkerByDoc({ crewId: Number(crewId), doc: String(doc).trim(), fullname });
    if (!worker) return res.status(400).json({ error: "No se pudo crear/obtener el trabajador" });

    const id = upsertAttendance({ workerId: worker.id, status });
    res.json({ ok: true, id, worker });
  } catch (e) { next(e); }
});

// POST /api/attendance/bulk   { crewId, items: [{doc,status,fullname?}, ...] }
router.post("/bulk", (req, res, next) => {
  try {
    const { crewId, items } = req.body || {};
    if (!crewId || !Array.isArray(items)) {
      return res.status(400).json({ error: "crewId e items son requeridos" });
    }

    const tx = db.transaction((arr) => {
      let count = 0;
      for (const it of arr) {
        const doc = (it.doc || "").toString().trim();
        const status = it.status === "absent" ? "absent" : "present";
        const fullname = it.fullname || null;
        if (!doc) continue;

        const worker = upsertWorkerByDoc({ crewId: Number(crewId), doc, fullname });
        if (!worker) continue;

        upsertAttendance({ workerId: worker.id, status });
        count++;
      }
      return count;
    });

    const count = tx(items);
    res.json({ ok: true, count });
  } catch (e) { next(e); }
});

// GET /api/attendance/today?crewId=1&date=YYYY-MM-DD
router.get("/today", (req, res, next) => {
  try {
    const crewId = Number(req.query.crewId || 1);
    const date = (req.query.date || dayjs().format("YYYY-MM-DD")).trim();

    const rows = db.prepare(`
      SELECT a.id, a.date, a.status, IFNULL(a.notes,'') AS notes,
             w.id AS worker_id, w.fullname, IFNULL(w.doc,'') AS doc,
             w.crew_id
      FROM attendance a
      JOIN workers w ON w.id = a.worker_id
      WHERE a.date = ? AND w.crew_id = ?
      ORDER BY w.fullname
    `).all(date, crewId);

    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
