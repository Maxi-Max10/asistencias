const express = require("express");
const dayjs = require("dayjs");
const db = require("../db");

const router = express.Router();

const isValidName = (s = "") => String(s).trim().length >= 2 && String(s).trim().length <= 80;
const isNum = (v) => v !== null && v !== undefined && !Number.isNaN(Number(v));
const inRange = (n, min, max) => typeof n === 'number' && n >= min && n <= max;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const today = () => dayjs().format("YYYY-MM-DD");

const normalizeDate = (value, fallback = today()) => {
  if (typeof value === "string" && DATE_RE.test(value.trim())) return value.trim();
  return fallback;
};

const isValidActivityText = (s = "") => {
  const v = String(s).trim();
  return v.length >= 2 && v.length <= 240;
};

const normalizeIncomingActivities = (raw, fallbackDate) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(item => {
      if (!item) return null;
      if (typeof item === "string") {
        const description = item.trim();
        if (!description) return null;
        return { description, date: fallbackDate };
      }
      if (typeof item === "object") {
        const description = String(item.description || "").trim();
        if (!description) return null;
        const date = normalizeDate(item.date, fallbackDate);
        return { description, date };
      }
      return null;
    })
    .filter(Boolean)
    .filter(it => isValidActivityText(it.description));
};

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

const selectCrew = db.prepare("SELECT id FROM crews WHERE id = ?");
const selectActivityById = db.prepare("SELECT id, crew_id, date, description, order_index FROM crew_activities WHERE id = ?");
const selectActivities = db.prepare("SELECT id, crew_id, date, description, order_index FROM crew_activities WHERE crew_id = ? AND date = ? ORDER BY order_index ASC, id ASC");
const selectMaxOrder = db.prepare("SELECT COALESCE(MAX(order_index), 0) AS max FROM crew_activities WHERE crew_id = ? AND date = ?");
const insertActivityStmt = db.prepare("INSERT INTO crew_activities (crew_id, date, description, order_index) VALUES (?,?,?,?)");
const deleteActivityStmt = db.prepare("DELETE FROM crew_activities WHERE id = ? AND crew_id = ?");
const deleteActivitiesByCrew = db.prepare("DELETE FROM crew_activities WHERE crew_id = ?");

const insertActivitiesTx = db.transaction(({ crewId, items }) => {
  if (!Array.isArray(items) || !items.length) return [];
  const grouped = new Map();
  for (const it of items) {
    if (!it || !isValidActivityText(it.description)) continue;
    const dateKey = normalizeDate(it.date, today());
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey).push(it.description.trim());
  }
  const inserted = [];
  for (const [dateKey, descriptions] of grouped.entries()) {
    let nextOrder = selectMaxOrder.get(crewId, dateKey)?.max ?? 0;
    for (const description of descriptions) {
      nextOrder += 1;
      const info = insertActivityStmt.run(crewId, dateKey, description, nextOrder);
      inserted.push(selectActivityById.get(info.lastInsertRowid));
    }
  }
  return inserted;
});

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
    const fallbackDate = normalizeDate(req.body?.activitiesDate, today());
    const rawActivities = Array.isArray(req.body?.activities) ? req.body.activities : [];
    const activities = normalizeIncomingActivities(rawActivities, fallbackDate);

    const createTx = db.transaction(() => {
      const info = db.prepare("INSERT INTO crews (name, lat, lng, map_url) VALUES (?,?,?,?)").run(name, loc.lat, loc.lng, loc.map_url);
      const crewId = info.lastInsertRowid;
      if (activities.length) insertActivitiesTx({ crewId, items: activities });
      return crewId;
    });

    const crewId = createTx();
    const row = db.prepare("SELECT id, name, lat, lng, map_url FROM crews WHERE id = ?").get(crewId);
    res.json(row);
  } catch (e) { next(e); }
});

// GET /api/crews/:id/activities?date=YYYY-MM-DD
router.get("/:id/activities", (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });
    const crew = selectCrew.get(id);
    if (!crew) return res.status(404).json({ error: "finca no encontrada" });
    const dateStr = normalizeDate(req.query.date, today());
    const rows = selectActivities.all(id, dateStr);
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/crews/:id/activities
router.post("/:id/activities", (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "id inválido" });
    const crew = selectCrew.get(id);
    if (!crew) return res.status(404).json({ error: "finca no encontrada" });

    const fallback = normalizeDate(req.body?.date, today());
    const description = req.body?.description ? String(req.body.description).trim() : "";
    const itemsPayload = Array.isArray(req.body?.items) ? req.body.items : null;

    if (itemsPayload && itemsPayload.length) {
      const normalized = normalizeIncomingActivities(itemsPayload, fallback);
      if (!normalized.length) return res.status(400).json({ error: "Actividades inválidas" });
      const inserted = insertActivitiesTx({ crewId: id, items: normalized });
      if (!inserted.length) return res.status(500).json({ error: "No se pudieron crear" });
      return res.status(201).json(inserted);
    }

    if (!isValidActivityText(description)) {
      return res.status(400).json({ error: "Descripción inválida (2-240 caracteres)" });
    }
    const dateStr = normalizeDate(req.body?.date, fallback);
    const inserted = insertActivitiesTx({ crewId: id, items: [{ description, date: dateStr }] });
    if (!inserted.length) return res.status(500).json({ error: "No se pudo crear" });
    res.status(201).json(inserted[0]);
  } catch (e) { next(e); }
});

// PUT /api/crews/:id/activities/:activityId
router.put("/:id/activities/:activityId", (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const activityId = Number(req.params.activityId);
    if (!id || !activityId) return res.status(400).json({ error: "id inválido" });
    const crew = selectCrew.get(id);
    if (!crew) return res.status(404).json({ error: "finca no encontrada" });
    const existing = selectActivityById.get(activityId);
    if (!existing || existing.crew_id !== id) return res.status(404).json({ error: "actividad no encontrada" });

    const fields = [];
    const values = [];

    if (req.body?.description !== undefined) {
      const newDesc = String(req.body.description).trim();
      if (!isValidActivityText(newDesc)) return res.status(400).json({ error: "Descripción inválida (2-240 caracteres)" });
      fields.push("description = ?");
      values.push(newDesc);
    }

    if (req.body?.date !== undefined) {
      const newDate = normalizeDate(req.body.date, existing.date);
      fields.push("date = ?");
      values.push(newDate);
    }

    if (req.body?.orderIndex !== undefined) {
      const oi = Number(req.body.orderIndex);
      if (!Number.isInteger(oi) || oi < 1 || oi > 1000) {
        return res.status(400).json({ error: "orderIndex inválido" });
      }
      fields.push("order_index = ?");
      values.push(oi);
    }

    if (!fields.length) {
      return res.status(400).json({ error: "Sin cambios" });
    }

    values.push(activityId, id);
    const stmt = db.prepare(`UPDATE crew_activities SET ${fields.join(", ")} WHERE id = ? AND crew_id = ?`);
    const info = stmt.run(...values);
    if (!info.changes) return res.status(500).json({ error: "No se pudo actualizar" });
    const row = selectActivityById.get(activityId);
    res.json(row);
  } catch (e) { next(e); }
});

// DELETE /api/crews/:id/activities/:activityId
router.delete("/:id/activities/:activityId", (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const activityId = Number(req.params.activityId);
    if (!id || !activityId) return res.status(400).json({ error: "id inválido" });
    const crew = selectCrew.get(id);
    if (!crew) return res.status(404).json({ error: "finca no encontrada" });
    const info = deleteActivityStmt.run(activityId, id);
    if (!info.changes) return res.status(404).json({ error: "actividad no encontrada" });
    res.json({ ok: true, id: activityId });
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
      deleteActivitiesByCrew.run(crewId);
      const info = db.prepare("DELETE FROM crews WHERE id = ?").run(crewId);
      return info.changes;
    });

    const changes = tx(id);
    if (!changes) return res.status(404).json({ error: "finca no encontrada" });
    res.json({ ok: true, id });
  } catch (e) { next(e); }
});

module.exports = router;
