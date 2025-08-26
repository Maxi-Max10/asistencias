import React, { useEffect, useState } from "react";
import AttendanceRecorder from "./components/AttendanceRecorder";
import Login from "./components/Login";
import TodayList from "./components/TodayList";

const API = import.meta.env.VITE_API || "http://127.0.0.1:4000";

export default function App() {
  const [today, setToday] = useState([]);
  const [err, setErr] = useState("");
  const [role, setRole] = useState(null);

  const load = async () => {
    setErr("");
    try {
      const r = await fetch(`${API}/api/attendance/today`, { cache: "no-store" });
      if (!r.ok) throw new Error(`${r.status}`);
      const t = await r.json();
      setToday(t);
    } catch (e) {
      setErr(`No pude cargar datos del backend: ${API}/api/attendance/today → ${e.message}`);
    }
  };

  useEffect(() => { load(); }, []);

  const removeRow = async (id) => {
    try {
      const ok = confirm("¿Eliminar este registro?");
      if (!ok) return;
      const r = await fetch(`${API}/api/attendance/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`${r.status}`);
      await load();
    } catch (e) {
      alert("No se pudo eliminar: " + e.message);
    }
  };

  if (!role) {
    return <Login onLogin={setRole} />;
  }

  if (role === "cuadrillero") {
    return (
      <div>
        <h1>Vista Cuadrillero</h1>
        <TodayList crewId={1} />
      </div>
    );
  }

  if (role === "admin") {
    return (
      <div>
        <h1>Vista Administrador</h1>
        {/* Aquí luego agregamos las funcionalidades de admin */}
        <TodayList crewId={1} />
      </div>
    );
  }

    return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Asistencia de Cuadrilla</h1>
      {err && <div className="mb-3 p-2 bg-red-100 text-red-700 rounded">{err}</div>}

      <AttendanceRecorder onSaved={load} />

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold mb-2">Hoy</h2>
          <a className="underline text-blue-600" href={`${API}/api/attendance/export.csv`} target="_blank" rel="noreferrer">
            Exportar CSV
          </a>
        </div>

        <ul className="mt-2 space-y-2">
          {today.map(r => (
            <li key={r.id} className="border rounded px-3 py-2 flex items-center justify-between">
              <div>
                <span className="font-medium">{r.doc || r.fullname}</span> — {r.status}
              </div>
              <button
                onClick={() => removeRow(r.id)}
                title="Eliminar"
                className="text-red-600 hover:bg-red-50 border border-red-200 rounded px-2 py-1 ml-3"
              >
                🗑
              </button>
            </li>
          ))}
          {!today.length && <li className="text-gray-500">Sin registros hoy.</li>}
        </ul>
      </div>
    </div>
  );
}

  return null;


