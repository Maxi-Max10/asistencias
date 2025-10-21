const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const db = require("./db");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));
app.set("etag", false);
app.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });

// Rutas API
app.use("/api/workers", require("./routes/workers"));
app.use("/api/attendance", require("./routes/attendance"));
const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);
app.use("/api/crews", require("./routes/crews"));

app.get("/health", (_req, res) => res.json({ ok: true }));

// Servir frontend (si existe build)
try {
  const distDir = process.env.FRONTEND_DIR || path.resolve(__dirname, "..", "web", "dist");
  app.use(express.static(distDir));
  app.get(/^(?!\/api\/).*/, (req, res, next) => {
    const indexPath = path.join(distDir, "index.html");
    res.sendFile(indexPath, (err) => (err ? next() : undefined));
  });
  console.log(`[WEB] Serving static from ${distDir}`);
} catch (e) {
  console.warn("[WEB] Static serving not configured:", e.message);
}

// Seed inicial de crews
try {
  const row = db.prepare("SELECT COUNT(*) AS c FROM crews").get();
  if (!row || !row.c) {
    const names = ["Finca A", "Finca B", "Finca C", "Finca D", "Finca E"];
    const ins = db.prepare("INSERT INTO crews (name) VALUES (?)");
    db.transaction(() => names.forEach(n => ins.run(n)))();
    console.log("Crews iniciales creados.");
  }
} catch (e) {
  console.error("Error auto-seeding crews:", e);
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API on http://0.0.0.0:${PORT}`));
