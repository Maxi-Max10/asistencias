const db = require("../db");

try {
  const tx = db.transaction(() => {
    const attCountRow = db.prepare(`SELECT COUNT(*) AS c FROM attendance`).get();
    const workersCountRow = db.prepare(`SELECT COUNT(*) AS c FROM workers`).get();
    const actCountRow = db.prepare(`SELECT COUNT(*) AS c FROM crew_activities`).get();
    const crewsCountRow = db.prepare(`SELECT COUNT(*) AS c FROM crews`).get();

    const delAttInfo = db.prepare(`DELETE FROM attendance`).run();
    const delWorkersInfo = db.prepare(`DELETE FROM workers`).run();
    const delActsInfo = db.prepare(`DELETE FROM crew_activities`).run();
    const delCrewsInfo = db.prepare(`DELETE FROM crews`).run();

    try {
      db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('attendance','workers','crew_activities','crews')`);
    } catch {}

    return {
      deletedAttendance: delAttInfo.changes ?? attCountRow.c ?? 0,
      deletedWorkers: delWorkersInfo.changes ?? workersCountRow.c ?? 0,
      deletedActivities: delActsInfo.changes ?? actCountRow.c ?? 0,
      deletedCrews: delCrewsInfo.changes ?? crewsCountRow.c ?? 0,
    };
  });

  const out = tx();
  console.log(`[purge-crews] OK -> attendance: ${out.deletedAttendance}, workers: ${out.deletedWorkers}, activities: ${out.deletedActivities}, crews: ${out.deletedCrews}`);
  process.exit(0);
} catch (e) {
  console.error("[purge-crews] ERROR:", e);
  process.exit(1);
}
