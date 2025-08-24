const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// Permitimos configurar el directorio del DB por env (útil en Render con disk)
const DB_DIR = process.env.DB_DIR || __dirname;

// Si el directorio no existe, crearlo
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const dbPath = path.join(DB_DIR, "fincas.db");
const db = new Database(dbPath);

// Si OneDrive te bloquea, podés usar DELETE:
// db.pragma("journal_mode = DELETE");
db.exec(`
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS crews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  crew_id INTEGER NOT NULL,
  fullname TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  doc TEXT,
  FOREIGN KEY (crew_id) REFERENCES crews(id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('present','absent')),
  notes TEXT,
  UNIQUE(worker_id, date),
  FOREIGN KEY (worker_id) REFERENCES workers(id)
);
`);

// 1) agregar columna doc si no existe
const hasDocCol = db
  .prepare(`SELECT 1 FROM pragma_table_info('workers') WHERE name='doc'`)
  .get();

if (!hasDocCol) {
  db.exec(`ALTER TABLE workers ADD COLUMN doc TEXT`);
}

// 2) índice único sobre doc (permite múltiples NULL, evita duplicados reales)
const hasDocIdx = db
  .prepare(`SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_workers_doc'`)
  .get();

if (!hasDocIdx) {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_workers_doc ON workers(doc)`);
}

module.exports = db;
