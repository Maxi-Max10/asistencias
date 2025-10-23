const db = require("./db");

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// Reset total de datos y creación de estructura solicitada:
// - 4 fincas, cada una con un nombre diferente
// - 4 cuadrilleros, asignados a las fincas
// - Por cada finca, 5 colaboradores distintos asociados al mismo crew

const tx = db.transaction(() => {
  // Borrar datos existentes
  db.exec(`
    DELETE FROM attendance;
    DELETE FROM workers;
    DELETE FROM crews;
  `);

  // Resetear autoincrement
  try { db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('attendance','workers','crews')`); } catch {}

  // Crear 4 fincas
  const fincaNames = ["Finca Norte", "Finca Sur", "Finca Este", "Finca Oeste"];
  const insCrew = db.prepare("INSERT INTO crews (name) VALUES (?)");
  const crewIds = fincaNames.map(n => insCrew.run(n).lastInsertRowid);

  // Cuadrilleros por finca (uno por crew)
  const cuadrilleros = [
    { fullname: "Carlos Alvarez", doc: "40111222" },
    { fullname: "María Romero", doc: "40222333" },
    { fullname: "Javier Pérez", doc: "40333444" },
    { fullname: "Lucía Fernández", doc: "40444555" },
  ];

  const colaboradores = [
    [
      { fullname: "Juan Gómez", doc: "41111001" },
      { fullname: "Ana Díaz", doc: "41111002" },
      { fullname: "Pedro López", doc: "41111003" },
      { fullname: "Sofía Herrera", doc: "41111004" },
      { fullname: "Diego Castro", doc: "41111005" },
    ],
    [
      { fullname: "Valentina Ríos", doc: "42222001" },
      { fullname: "Martín Flores", doc: "42222002" },
      { fullname: "Camila Torres", doc: "42222003" },
      { fullname: "Tomás Silva", doc: "42222004" },
      { fullname: "Paula Núñez", doc: "42222005" },
    ],
    [
      { fullname: "Agustín Sosa", doc: "43333001" },
      { fullname: "Micaela Ruiz", doc: "43333002" },
      { fullname: "Nicolás Vega", doc: "43333003" },
      { fullname: "Florencia Luna", doc: "43333004" },
      { fullname: "Bruno Cabrera", doc: "43333005" },
    ],
    [
      { fullname: "Julieta Ortiz", doc: "44444001" },
      { fullname: "Franco Medina", doc: "44444002" },
      { fullname: "Milagros Ferreira", doc: "44444003" },
      { fullname: "Santiago Ramos", doc: "44444004" },
      { fullname: "Carolina Bustos", doc: "44444005" },
    ],
  ];

  const insWorker = db.prepare("INSERT INTO workers (crew_id, fullname, doc, active, created_at) VALUES (?,?,?,1, CURRENT_TIMESTAMP)");
  const workerIdsPerCrew = [];

  for (let i = 0; i < crewIds.length; i++) {
    const crewId = crewIds[i];
    const lid = insWorker.run(crewId, cuadrilleros[i].fullname, cuadrilleros[i].doc).lastInsertRowid; // cuadrillero
    const colls = colaboradores[i];
    const ids = [lid];
    for (const c of colls) {
      const wid = insWorker.run(crewId, c.fullname, c.doc).lastInsertRowid;
      ids.push(wid);
    }
    workerIdsPerCrew.push(ids);
  }

  // Cargar algunas asistencias de hoy para que el dashboard y las vistas tengan datos
  const date = todayISO();
  const insAtt = db.prepare("INSERT INTO attendance (worker_id, date, status, notes) VALUES (?,?,?,?)");
  for (const ids of workerIdsPerCrew) {
    // Marcar 4 presentes y 2 ausentes por crew (incluye cuadrillero como presente)
    const present = ids.slice(0, 4);
    const absent = ids.slice(4);
    for (const wid of present) insAtt.run(wid, date, 'present', null);
    for (const wid of absent) insAtt.run(wid, date, 'absent', null);
  }
});

tx();

console.log("Demo data creada:");
console.log("- 4 fincas (crews)");
console.log("- 4 cuadrilleros (uno por finca)");
console.log("- 5 colaboradores por finca (20 en total)");
console.log("- Asistencias de hoy registradas (presentes/ausentes)");
