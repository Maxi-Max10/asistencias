import React, { useEffect, useState } from "react";
const API = import.meta.env.VITE_API || "http://127.0.0.1:4000";

export default function TodayList({ crewId, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API}/api/attendance/today?crewId=${crewId}`, { cache: "no-store" });
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Cargar asistencias de hoy:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [crewId, refreshKey]);

  if (loading) return <div className="text-sm opacity-70">Cargando...</div>;
  if (!rows.length) return <div className="text-sm opacity-70">Sin registros aún.</div>;

  return (
    <div className="mt-4 border rounded p-3">
      <div className="font-semibold mb-2">Asistencias de hoy</div>
      <ul className="space-y-1">
        {rows.map(r => (
          <li key={r.id} className="flex items-center justify-between border-b last:border-none py-1">
            <div>
              <div className="font-medium">{r.fullname || r.doc}</div>
              {r.doc ? <div className="text-xs opacity-70">{r.doc}</div> : null}
            </div>
            <span className={`text-xs px-2 py-1 rounded ${r.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {r.status === 'present' ? 'Presente' : 'Ausente'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
