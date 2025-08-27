import React, { useEffect, useState } from "react";
const API = import.meta.env.VITE_API || "http://127.0.0.1:4000";

export default function TodayList({ crewId, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const role = typeof window !== "undefined" ? window.localStorage.getItem("role") : null;

  async function load() {
    try {
      setLoading(true);
      const r = await fetch(`${API}/api/attendance/today?crewId=${crewId}`, { cache: "no-store" });
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [crewId, refreshKey]);

  const handleDelete = async (id) => {
    if (!id) return;
    if (!confirm("¿Eliminar este registro?")) return;
    try {
      const r = await fetch(`${API}/api/attendance/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        alert(`No se pudo eliminar: ${err.error || r.statusText}`);
      } else {
        await load();
      }
    } catch (e) {
      console.error(e);
      alert("Error eliminando el registro");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Asistencias de hoy</h3>
        {loading && <span className="text-sm opacity-70">Cargando...</span>}
      </div>

      <ul className="divide-y">
        {rows.map((r) => (
          <li key={r.id} className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium truncate">{r.fullname || r.doc}</div>
              <div className="text-xs text-gray-500 truncate">{r.doc}</div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-1 rounded ${
                  r.status === "present"
                    ? "bg-green-100 text-green-700"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {r.status === "present" ? "Presente" : "Ausente"}
              </span>
              {role === "admin" && (
                <button
                  onClick={() => handleDelete(r.id)}
                  title="Eliminar asistencia"
                  className="text-xs px-2 py-1 border rounded hover:bg-rose-50"
                >
                  🗑 Eliminar
                </button>
              )}
            </div>
          </li>
        ))}
        {!rows.length && !loading && (
          <li className="py-3 text-gray-500">Sin registros hoy.</li>
        )}
      </ul>
    </div>
  );
}
