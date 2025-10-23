const express = require("express");
const dayjs = require("dayjs");
const db = require("../db");

const router = express.Router();

/* ===================== Helpers DB ===================== */

// crea (si no existe) un trabajador por doc + crewId
function upsertWorkerByDoc({ crewId, doc, fullname = null }) {
  if (!doc || !crewId) return null;

  // Busca por crewId y doc
  const w = db.prepare(`SELECT * FROM workers WHERE crew_id = ? AND doc = ?`).get(crewId, doc);
  if (w) return w;

  const name = fullname && fullname.trim() ? fullname.trim() : doc;
  const info = db
    .prepare(`INSERT INTO workers (crew_id, fullname, active, doc) VALUES (?, ?, 1, ?)`)
    .run(crewId, name, doc);

  return db.prepare(`SELECT * FROM workers WHERE id = ?`).get(info.lastInsertRowid);
}

// guarda/actualiza la asistencia de HOY para worker
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

/* ===================== Rutas ===================== */

// Alta individual
// body: { crewId, doc, status, fullname? }
router.post("/", (req, res, next) => {
  try {
    const crewId = Number(req.body?.crewId ?? req.query?.crewId); // <= CLAVE
    const { doc, status, fullname } = req.body || {};
    if (!crewId || !doc || !status) {
      return res.status(400).json({ error: "crewId, doc y status son requeridos" });
    }
    const worker = upsertWorkerByDoc({
      crewId: Number(crewId),
      doc: String(doc).trim(),
      fullname: fullname || null
    });
    if (!worker) return res.status(400).json({ error: "No se pudo crear/obtener el trabajador" });

    const id = upsertAttendance({ workerId: worker.id, status });
    res.json({ ok: true, id, worker });
  } catch (e) { next(e); }
});

// Alta masiva por voz
// body: { crewId, items: [{doc,status,fullname?}, ...] }
router.post("/bulk", (req, res, next) => {
  try {
    console.log("POST /attendance/bulk", {
      crewId: req.body?.crewId,
      count: req.body?.items?.length,
      body: req.body,
    });

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
    return res.json({ ok: true, count });
  } catch (e) {
    console.error("🔥 ERROR en /attendance/bulk:", e);  // 👈 agregá esto
    return res.status(500).json({ error: "internal_error", detail: String(e) });
  }
});


// Listado del día por cuadrilla
// GET /api/attendance/today?crewId=2&date=YYYY-MM-DD
router.get("/today", (req, res, next) => {
  try {
    const crewId = Number(req.query.crewId || 1);
    const date = dayjs().format("YYYY-MM-DD");
    const rows = db.prepare(`
      SELECT attendance.id, workers.fullname, workers.doc, attendance.status
      FROM attendance
      JOIN workers ON attendance.worker_id = workers.id
      WHERE workers.crew_id = ? AND attendance.date = ?
    `).all(crewId, date);
    res.json(rows);
  } catch (e) { next(e); }
});

// Resumen por cuadrilla (hoy)
// GET /api/attendance/summary              -> resumen de todas las cuadrillas activas
// GET /api/attendance/summary?crewId=2     -> resumen solo de una cuadrilla
router.get("/summary", (req, res, next) => {
  try {
    const crewId = req.query.crewId ? Number(req.query.crewId) : null;
    const date = dayjs().format("YYYY-MM-DD");

    if (crewId) {
      const totalWorkersRow = db.prepare(`
        SELECT COUNT(*) AS total
        FROM workers
        WHERE crew_id = ? AND active = 1
      `).get(crewId);

      const presentRow = db.prepare(`
        SELECT COUNT(a.id) AS total
        FROM attendance a
        JOIN workers w ON a.worker_id = w.id
        WHERE w.crew_id = ? AND a.date = ? AND a.status = 'present'
      `).get(crewId, date);

      const absentRow = db.prepare(`
        SELECT COUNT(a.id) AS total
        FROM attendance a
        JOIN workers w ON a.worker_id = w.id
        WHERE w.crew_id = ? AND a.date = ? AND a.status = 'absent'
      `).get(crewId, date);

      const recordedRow = db.prepare(`
        SELECT COUNT(a.id) AS total
        FROM attendance a
        JOIN workers w ON a.worker_id = w.id
        WHERE w.crew_id = ? AND a.date = ?
      `).get(crewId, date);

      const totalWorkers = totalWorkersRow?.total || 0;
      const present = presentRow?.total || 0;
      const absent = absentRow?.total || 0;
      const recorded = recordedRow?.total || 0;
      const pending = Math.max(0, totalWorkers - recorded);

      return res.json({ crewId, totalWorkers, present, absent, pending, recorded });
    }

    // Todas las cuadrillas: obtenemos lista de crew_id activos
    const crews = db.prepare(`
      SELECT DISTINCT crew_id AS id
      FROM workers
      WHERE crew_id IS NOT NULL AND active = 1
      ORDER BY 1
    `).all();

    const out = crews.map(({ id }) => {
      const totalWorkersRow = db.prepare(`
        SELECT COUNT(*) AS total
        FROM workers
        WHERE crew_id = ? AND active = 1
      `).get(id);

      const presentRow = db.prepare(`
        SELECT COUNT(a.id) AS total
        FROM attendance a
        JOIN workers w ON a.worker_id = w.id
        WHERE w.crew_id = ? AND a.date = ? AND a.status = 'present'
      `).get(id, date);

      const absentRow = db.prepare(`
        SELECT COUNT(a.id) AS total
        FROM attendance a
        JOIN workers w ON a.worker_id = w.id
        WHERE w.crew_id = ? AND a.date = ? AND a.status = 'absent'
      `).get(id, date);

      const recordedRow = db.prepare(`
        SELECT COUNT(a.id) AS total
        FROM attendance a
        JOIN workers w ON a.worker_id = w.id
        WHERE w.crew_id = ? AND a.date = ?
      `).get(id, date);

      const totalWorkers = totalWorkersRow?.total || 0;
      const present = presentRow?.total || 0;
      const absent = absentRow?.total || 0;
      const recorded = recordedRow?.total || 0;
      const pending = Math.max(0, totalWorkers - recorded);

      return { crewId: id, totalWorkers, present, absent, pending, recorded };
    });

    return res.json(out);
  } catch (e) { next(e); }
});

// Eliminar una carga de asistencia por ID
// DELETE /api/attendance/:id
router.delete("/:id", (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "ID requerido" });

    const info = db.prepare(`DELETE FROM attendance WHERE id = ?`).run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: "No se encontró la asistencia" });
    }
    res.json({ ok: true, deleted: id });
  } catch (e) { next(e); }
});

module.exports = router;
