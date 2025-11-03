const express = require("express");
const dayjs = require("dayjs");
const db = require("../db");

const router = express.Router();

/**
 * GET /api/admin/dashboard
 * Devuelve estadísticas para el dashboard del admin.
 * - totalAsistencias: cantidad de registros 'present' de trabajadores que pertenecen a una cuadrilla (crew_id IS NOT NULL)
 * - cuadrillerosUnicos: cantidad de cuadrillas distintas (workers.crew_id)
 * - filasHechas: total de filas en attendance
 * - promFilasCuadrillero: promedio filas por cuadrilla
 * - weekly: datos por día (últimos 7 días) { labels, filas, asistencias, meta }
 * - topFincas: top por crew_id (filas + asistencias), nombre provisional "Cuadrilla {id}"
 * - recent: últimos 30 registros con info del trabajador
 */
router.get("/dashboard", (req, res, next) => {
  try {
    // total asistencias: present de workers que pertenecen a una cuadrilla
    const totalAsistenciasRow = db
      .prepare(`
        SELECT COUNT(a.id) AS total
        FROM attendance a
        JOIN workers w ON a.worker_id = w.id
        WHERE a.status = 'present' AND w.crew_id IS NOT NULL
      `).get();
    const totalAsistencias = (totalAsistenciasRow && totalAsistenciasRow.total) || 0;

    // cuadrilleros únicos (crew_id not null)
    const cuadUnicosRow = db
      .prepare(`SELECT COUNT(DISTINCT crew_id) AS total FROM workers WHERE crew_id IS NOT NULL`).get();
    const cuadrillerosUnicos = (cuadUnicosRow && cuadUnicosRow.total) || 0;

    // filas hechas (total attendance rows)
    const filasRow = db.prepare(`SELECT COUNT(*) AS total FROM attendance`).get();
    const filasHechas = (filasRow && filasRow.total) || 0;

    const promFilasCuadrillero = cuadrillerosUnicos ? Number((filasHechas / cuadrillerosUnicos).toFixed(2)) : 0;

    // Weekly aggregation (last 7 days)
    const today = dayjs();
    const labels = [];
    const filas = [];
    const asistencias = [];
    const meta = []; // placeholder: can be provided by business logic or config

    for (let i = 6; i >= 0; i--) {
      const d = today.subtract(i, "day").format("YYYY-MM-DD");
      labels.push(today.subtract(i, "day").format("ddd")); // Lun, Mar, ...
      const filaRow = db.prepare(`
        SELECT COUNT(a.id) AS total
        FROM attendance a
        JOIN workers w ON a.worker_id = w.id
        WHERE a.date = ? AND w.crew_id IS NOT NULL
      `).get(d);
      const asistRow = db.prepare(`
        SELECT COUNT(a.id) AS total
        FROM attendance a
        JOIN workers w ON a.worker_id = w.id
        WHERE a.date = ? AND a.status = 'present' AND w.crew_id IS NOT NULL
      `).get(d);
      filas.push((filaRow && filaRow.total) || 0);
      asistencias.push((asistRow && asistRow.total) || 0);
      meta.push(null); // o setear objetivo si tenés esa info
    }

  // Top fincas/cuadrillas (por filas)
    const topRows = db.prepare(`
      SELECT w.crew_id AS id,
             c.name      AS name,
             COUNT(a.id) AS filas,
             SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS asistencias
      FROM attendance a
      JOIN workers w ON a.worker_id = w.id
      LEFT JOIN crews c ON c.id = w.crew_id
      WHERE w.crew_id IS NOT NULL
      GROUP BY w.crew_id
      ORDER BY filas DESC
      LIMIT 6
    `).all();

    const topFincas = (topRows || []).map(r => ({
      id: r.id,
      name: r.name || `Cuadrilla ${r.id}`,
      filas: r.filas || 0,
      asistencias: r.asistencias || 0,
    }));

    // Recent diario completo (snapshot del día): incluye TODOS los trabajadores activos
    // Política: si no hay registro de attendance, cuenta como presente (1)
    const day = dayjs().format("YYYY-MM-DD");
    const queryDate = req.query.date && String(req.query.date).match(/^\d{4}-\d{2}-\d{2}$/)
      ? String(req.query.date)
      : day;

    const recent = db.prepare(`
      SELECT
        w.id            AS workerId,
        w.fullname      AS fullname,
        w.doc           AS doc,
        w.crew_id       AS crewId,
        a.id            AS attendanceId,
        a.status        AS status,
        CASE
          WHEN a.status = 'absent'  THEN 0
          WHEN a.status = 'present' THEN 1
          WHEN a.id IS NULL         THEN 1
          ELSE 0
        END             AS asistencias,
        ?               AS date,
        0               AS filas
      FROM workers w
      LEFT JOIN attendance a
        ON a.worker_id = w.id AND a.date = ?
      WHERE w.active = 1 AND w.crew_id IS NOT NULL
      ORDER BY w.fullname COLLATE NOCASE ASC
      LIMIT 1000
    `).all(queryDate, queryDate).map(r => ({
      id: r.attendanceId || `w-${r.workerId}`,
      date: queryDate,
      status: r.status || 'present', // coherente con política por defecto
      workerId: r.workerId,
      fullname: r.fullname,
      doc: r.doc,
      crewId: r.crewId,
      asistencias: Number(r.asistencias) || 0,
      filas: 0,
    }));


    res.json({
      totalAsistencias,
      cuadrillerosUnicos,
      filasHechas,
      promFilasCuadrillero,
      weekly: { labels, filas, asistencias, meta },
      topFincas,
      recent,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;