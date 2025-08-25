const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

// Directorio DB: intenta /var/data, si no es escribible cae a __dirname
let DB_DIR = process.env.DB_DIR || "/var/data";
function ensureWritable(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    const p = path.join(dir, ".w");
    fs.writeFileSync(p, "ok");
    fs.unlinkSync(p);
    return true;
  } catch (e) {
    console.warn(`DB_DIR no escribible (${dir}). Fallback a __dirname.`, e.message);
    return false;
  }
}
if (!ensureWritable(DB_DIR)) {
  DB_DIR = __dirname;
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const dbPath = path.join(DB_DIR, "fincas.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// Esquema
db.exec(`
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

// Migraciones suaves
const hasDoc = db.prepare(`SELECT 1 FROM pragma_table_info('workers') WHERE name='doc'`).get();
if (!hasDoc) db.exec(`ALTER TABLE workers ADD COLUMN doc TEXT`);
const hasDocIdx = db.prepare(`SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_workers_doc'`).get();
if (!hasDocIdx) db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_workers_doc ON workers(doc)`);

module.exports = db;
