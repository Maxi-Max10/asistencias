const db = require("./db");
const crewId = db.prepare("INSERT INTO crews (name) VALUES (?)").run("Cuadrilla 1").lastInsertRowid;

["Juan Perez","Maria Lopez","Carlos Diaz","Ana Gomez","Luis Romero"].forEach(n=>{
  db.prepare("INSERT INTO workers (crew_id, fullname) VALUES (?,?)").run(crewId, n);
});
console.log("Seed ok");
