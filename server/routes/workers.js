const express = require("express");
const db = require("../db");

const router = express.Router();
const normDoc = (s = "") => String(s).replace(/[^0-9a-z]/gi, "").toUpperCase();
const isValidDoc = (s = "") => /^[0-9]{5,15}$/.test(String(s)); // 5 a 15 dígitos
const isValidName = (s = "") => /^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ ]{2,60}$/.test(String(s).trim());

// GET /api/workers?crewId=1
router.get("/", (req, res, next) => {
  try {
    const crewId = Number(req.query.crewId || 1);
    const rows = db.prepare(`
      SELECT id, fullname, IFNULL(doc,'') AS doc
      FROM workers
      WHERE crew_id = ? AND active = 1
      ORDER BY fullname
    `).all(crewId);
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/workers { crewId, doc, fullname }
router.post("/", (req, res, next) => {
  try {
    const crew = Number(req.body?.crewId || 1);
    const { doc, fullname } = req.body || {};
    if (!doc) return res.status(400).json({ error: "Documento requerido" });

    const ndoc = normDoc(doc);
    if (!isValidDoc(ndoc)) return res.status(400).json({ error: "Documento inválido (solo dígitos, 5-15)" });
    if (fullname != null && String(fullname).trim() && !isValidName(fullname)) {
      return res.status(400).json({ error: "Nombre inválido (solo letras y espacios, 2-60)" });
    }
    // Busca por crew y doc (incluye estado activo)
    const byDoc = db.prepare("SELECT id, fullname, doc, active FROM workers WHERE crew_id = ? AND doc = ?").get(crew, ndoc);
    if (byDoc) {
      // Si existe y está inactivo, reactivarlo (y opcionalmente actualizar nombre)
      if (Number(byDoc.active) === 0) {
        const name = (fullname && String(fullname).trim()) || byDoc.fullname || ndoc;
        db.prepare("UPDATE workers SET active = 1, fullname = ? WHERE id = ?").run(name, byDoc.id);
        const row = db.prepare("SELECT id, fullname, doc, crew_id, active FROM workers WHERE id = ?").get(byDoc.id);
        return res.json(row);
      }
      // Ya existe y activo: devolverlo tal cual
      return res.json(byDoc);
    }

    const name = (fullname && String(fullname).trim()) || ndoc;
    const info = db.prepare("INSERT INTO workers (crew_id, fullname, doc) VALUES (?,?,?)")
      .run(crew, name, ndoc);

    res.json({ id: info.lastInsertRowid, fullname: name, doc: ndoc, crew_id: crew, active: 1 });
  } catch (e) { next(e); }
});

module.exports = router;

// PUT /api/workers/:id { fullname?, doc?, crewId? }
router.put("/:id", (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });

    const { fullname, doc, crewId } = req.body || {};
    const fields = [];
    const params = [];

    if (crewId != null) { fields.push("crew_id = ?"); params.push(Number(crewId)); }
    if (fullname != null) {
      if (String(fullname).trim() && !isValidName(fullname)) return res.status(400).json({ error: "Nombre inválido (solo letras y espacios, 2-60)" });
      fields.push("fullname = ?"); params.push(String(fullname).trim() || "-");
    }
    if (doc != null) {
      const nd = normDoc(doc);
      if (!isValidDoc(nd)) return res.status(400).json({ error: "Documento inválido (solo dígitos, 5-15)" });
      fields.push("doc = ?"); params.push(nd);
    }

    if (!fields.length) return res.status(400).json({ error: "Nada para actualizar" });

    const set = fields.join(", ");
    const info = db.prepare(`UPDATE workers SET ${set} WHERE id = ?`).run(...params, id);
    if (!info.changes) return res.status(404).json({ error: "worker no encontrado" });

    const row = db.prepare("SELECT id, crew_id, fullname, doc, active FROM workers WHERE id = ?").get(id);
    res.json(row);
  } catch (e) { next(e); }
});

// DELETE /api/workers/:id  (soft delete -> active = 0)
router.delete("/:id", (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });
    const info = db.prepare("UPDATE workers SET active = 0 WHERE id = ?").run(id);
    if (!info.changes) return res.status(404).json({ error: "worker no encontrado" });
    res.json({ ok: true });
  } catch (e) { next(e); }
});
