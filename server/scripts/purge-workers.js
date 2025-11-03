const db = require("../db");

try {
  const tx = db.transaction(() => {
    const attCountRow = db.prepare(`SELECT COUNT(*) AS c FROM attendance`).get();
    const workersCountRow = db.prepare(`SELECT COUNT(*) AS c FROM workers`).get();

    const delAttInfo = db.prepare(`DELETE FROM attendance`).run();
    const delWorkersInfo = db.prepare(`DELETE FROM workers`).run();

    try {
      db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('attendance','workers')`);
    } catch {}

    return {
      deletedAttendance: delAttInfo.changes ?? attCountRow.c ?? 0,
      deletedWorkers: delWorkersInfo.changes ?? workersCountRow.c ?? 0,
    };
  });

  const out = tx();
  console.log(`[purge-workers] OK -> attendance: ${out.deletedAttendance}, workers: ${out.deletedWorkers}`);
  process.exit(0);
} catch (e) {
  console.error("[purge-workers] ERROR:", e);
  process.exit(1);
}
