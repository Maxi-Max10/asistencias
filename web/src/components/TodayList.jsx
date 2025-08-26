import React, { useEffect, useState } from "react";
const API = import.meta.env.VITE_API || "http://127.0.0.1:4000";

export default function TodayList({ crewId, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API}/api/attendance/today?crewId=${crewId}`, { cache: "no-store" });
        const data = await r.json();
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Cargar asistencias de hoy:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [crewId, refreshKey]);

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta carga de asistencia?")) return;
    try {
      await fetch(`${API}/api/attendance/${id}`, { method: "DELETE" });
      setRows(rows.filter(r => r.id !== id));
    } catch (e) {
      alert("No se pudo eliminar la asistencia.");
    }
  };

  if (loading) return <div className="text-sm opacity-70">Cargando...</div>;
  if (!rows.length) return <div className="text-sm opacity-70">Sin registros aún.</div>;

  return (
    <div className="mt-4 border rounded p-3">
      <div className="font-semibold mb-2">ASISTENCIA DE HOY</div>
      <ul className="space-y-1">
        {rows.map(r => (
          <li
            key={r.id}
            className="flex items-center justify-between border-b last:border-none py-1"
          >
            <div className="flex-1">
              <div className="font-medium">{r.fullname || r.doc}</div>
              {r.doc ? <div className="text-xs opacity-70">{r.doc}</div> : null}
            </div>
            <span className={`mx-2 text-xs px-2 py-1 rounded ${r.status === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {r.status === 'present' ? 'Presente' : 'Ausente'}
            </span>
            <button
              className="text-xs font-bold text-white bg-red-500 px-2 py-1 rounded hover:bg-red-700 ml-2"
              onClick={() => handleDelete(r.id)}
              title="Eliminar asistencia"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
