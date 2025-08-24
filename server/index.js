const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const app = express();

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

const PORT = process.env.PORT || 4000;
// En Render es importante NO fijar 127.0.0.1
app.listen(PORT, () => {
  console.log(`API on http://0.0.0.0:${PORT}`);
});
