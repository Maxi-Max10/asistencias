const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const db = require("./db");

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

app.get("/health", (_req, res) => res.json({ ok: true }));

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
