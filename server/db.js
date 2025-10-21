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
db.pragma("foreign_keys = ON");
console.log(`[DB] SQLite path: ${dbPath}`);

// Esquema
db.exec(`
CREATE TABLE IF NOT EXISTS crews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  lat REAL,
  lng REAL,
  map_url TEXT
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

// Elimina índice único global si existe
const hasDocIdx = db.prepare(`SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_workers_doc'`).get();
if (hasDocIdx) db.exec(`DROP INDEX idx_workers_doc`);

// Crea índice único por crew_id + doc
const hasCrewDocIdx = db.prepare(`SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_workers_crew_doc'`).get();
if (!hasCrewDocIdx) db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_workers_crew_doc ON workers(crew_id, doc)`);

// Índice único en nombre de crew (sensitivo a caso); validamos case-insensitive en app
const hasCrewNameIdx = db.prepare(`SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_crews_name'`).get();
if (!hasCrewNameIdx) db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_crews_name ON crews(name)`);

// Migraciones suaves para columns nuevas en crews
const colInfo = (col) => db.prepare(`SELECT 1 FROM pragma_table_info('crews') WHERE name = ?`).get(col);
if (!colInfo('lat')) db.exec(`ALTER TABLE crews ADD COLUMN lat REAL`);
if (!colInfo('lng')) db.exec(`ALTER TABLE crews ADD COLUMN lng REAL`);
if (!colInfo('map_url')) db.exec(`ALTER TABLE crews ADD COLUMN map_url TEXT`);

module.exports = db;
