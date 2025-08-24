const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const app = express();
const db = require("./db");

app.use(cors());               // permitir desde cualquier origen
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/workers", require("./routes/workers"));
app.use("/api/attendance", require("./routes/attendance"));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use((err, _req, res, _next) => {
  console.error("API error:", err);
  res.status(500).json({ error: "internal_error", detail: String(err.message || err) });
});

app.set("etag", false);
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

try {
  const row = db.prepare("SELECT COUNT(*) AS c FROM crews").get();
  if (!row || !row.c) {
    const names = ["Finca A", "Finca B", "Finca C", "Finca D", "Finca E"];
    const stmt = db.prepare("INSERT INTO crews (name) VALUES (?)");
    db.transaction(() => {
      for (const n of names) stmt.run(n);
    })();
    console.log("Crews iniciales creados.");
  }
} catch (e) {
  console.error("Error auto-seeding crews:", e);
}

const PORT = process.env.PORT || 4000;
// Render expone el puerto en process.env.PORT y escucha en 0.0.0.0
app.listen(PORT, () => {
  console.log(`API on http://0.0.0.0:${PORT}`);
});

