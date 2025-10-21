const express = require("express");
const db = require("../db");

const router = express.Router();

const isValidName = (s = "") => String(s).trim().length >= 2 && String(s).trim().length <= 80;
const isNum = (v) => v !== null && v !== undefined && !Number.isNaN(Number(v));
const inRange = (n, min, max) => typeof n === 'number' && n >= min && n <= max;

function extractLatLng(input) {
  if (!input) return null;
  const s = String(input).trim();
  // patterns: @lat,lng or q=lat,lng or /place/..../@lat,lng
  const at = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
  const q = s.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
  // plain "lat,lng"
  const plain = s.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
  if (plain) return { lat: parseFloat(plain[1]), lng: parseFloat(plain[2]) };
  return null;
}

function normalizeMap(lat, lng, mapUrl) {
  let a = lat, b = lng, url = mapUrl || null;
  if (!isNum(a) || !isNum(b)) {
    const ex = extractLatLng(mapUrl);
    if (ex) { a = ex.lat; b = ex.lng; }
  }
  if (isNum(a) && isNum(b)) {
    const la = parseFloat(a), lb = parseFloat(b);
    if (inRange(la, -90, 90) && inRange(lb, -180, 180)) {
      url = `https://www.google.com/maps?q=${la},${lb}`;
      return { lat: la, lng: lb, map_url: url };
    }
  }
  return { lat: null, lng: null, map_url: url || null };
}

// GET /api/crews -> list all crews
router.get("/", (_req, res, next) => {
  try {
    const rows = db.prepare("SELECT id, name, lat, lng, map_url FROM crews ORDER BY id").all();
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/crews { name }
router.post("/", (req, res, next) => {
  try {
    const name = String(req.body?.name || "").trim();
    const lat = req.body?.lat;
    const lng = req.body?.lng;
    const mapUrl = req.body?.mapUrl || req.body?.map_url;
    if (!isValidName(name)) return res.status(400).json({ error: "Nombre inválido (2-80 caracteres)" });

    const dup = db.prepare("SELECT 1 FROM crews WHERE lower(name) = lower(?)").get(name);
    if (dup) return res.status(409).json({ error: "Ya existe una finca con ese nombre" });

    const loc = normalizeMap(lat, lng, mapUrl);
    const info = db.prepare("INSERT INTO crews (name, lat, lng, map_url) VALUES (?,?,?,?)").run(name, loc.lat, loc.lng, loc.map_url);
    const row = db.prepare("SELECT id, name, lat, lng, map_url FROM crews WHERE id = ?").get(info.lastInsertRowid);
    res.json(row);
  } catch (e) { next(e); }
});

// PUT /api/crews/:id { name }
router.put("/:id", (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });
  const name = String(req.body?.name || "").trim();
  const lat = req.body?.lat;
  const lng = req.body?.lng;
  const mapUrl = req.body?.mapUrl || req.body?.map_url;
    if (!isValidName(name)) return res.status(400).json({ error: "Nombre inválido (2-80 caracteres)" });

    const dup = db.prepare("SELECT 1 FROM crews WHERE lower(name) = lower(?) AND id <> ?").get(name, id);
    if (dup) return res.status(409).json({ error: "Ya existe una finca con ese nombre" });

    const loc = normalizeMap(lat, lng, mapUrl);
    const info = db.prepare("UPDATE crews SET name = ?, lat = ?, lng = ?, map_url = ? WHERE id = ?").run(name, loc.lat, loc.lng, loc.map_url, id);
    if (!info.changes) return res.status(404).json({ error: "finca no encontrada" });
    const row = db.prepare("SELECT id, name, lat, lng, map_url FROM crews WHERE id = ?").get(id);
    res.json(row);
  } catch (e) { next(e); }
});

// DELETE /api/crews/:id (cascade manual sobre workers y attendance)
router.delete("/:id", (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });

    const tx = db.transaction((crewId) => {
      // borrar attendance de los workers del crew
      const workerIds = db.prepare("SELECT id FROM workers WHERE crew_id = ?").all(crewId).map(r => r.id);
      if (workerIds.length) {
        const delAtt = db.prepare("DELETE FROM attendance WHERE worker_id = ?");
        workerIds.forEach(wid => delAtt.run(wid));
      }
      // borrar workers y luego crew
      db.prepare("DELETE FROM workers WHERE crew_id = ?").run(crewId);
      const info = db.prepare("DELETE FROM crews WHERE id = ?").run(crewId);
      return info.changes;
    });

    const changes = tx(id);
    if (!changes) return res.status(404).json({ error: "finca no encontrada" });
    res.json({ ok: true, id });
  } catch (e) { next(e); }
});

module.exports = router;
