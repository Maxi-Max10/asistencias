const db = require("./db");

// Seed idempotente: crea crews base si no existen y agrega algunos workers demo si la tabla está vacía
const crewsBase = ["Finca A", "Finca B", "Finca C", "Finca D", "Finca E"];
const crewCount = db.prepare("SELECT COUNT(*) AS c FROM crews").get()?.c || 0;
if (!crewCount) {
  const ins = db.prepare("INSERT INTO crews (name) VALUES (?)");
  db.transaction(() => crewsBase.forEach(n => ins.run(n)))();
  console.log("Crews base insertados");
}

const workersCount = db.prepare("SELECT COUNT(*) AS c FROM workers").get()?.c || 0;
if (!workersCount) {
  const crewRow = db.prepare("SELECT id FROM crews ORDER BY id LIMIT 1").get();
  const crewId = crewRow?.id || 1;
  const people = [
    { fullname: "Juan Perez", doc: "41443236" },
    { fullname: "Maria Lopez", doc: "39876543" },
    { fullname: "Carlos Diaz", doc: "42789012" },
    { fullname: "Ana Gomez", doc: "38555111" },
    { fullname: "Luis Romero", doc: "40123456" },
  ];
  const insW = db.prepare("INSERT INTO workers (crew_id, fullname, doc, active) VALUES (?,?,?,1)");
  db.transaction(() => people.forEach(p => insW.run(crewId, p.fullname, p.doc)))();
  console.log("Workers demo insertados");
}

console.log("Seed ok");
