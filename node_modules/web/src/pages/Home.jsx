import React from "react";
import { Link } from "react-router-dom";

const FINCAS = [
  { id: 1, name: "Finca A", color: "bg-blue-600" },
  { id: 2, name: "Finca B", color: "bg-green-600" },
  { id: 3, name: "Finca C", color: "bg-purple-600" },
  { id: 4, name: "Finca D", color: "bg-amber-600" },
  { id: 5, name: "Finca E", color: "bg-rose-600" },
];

export default function Home(){
  return (
    <div className="min-h-screen p-6 flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-bold">¡Bienvenidosss! Seleccione finca</h1>
        <p className="text-sm opacity-70">Elija una cuadrilla para cargar asistencia.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FINCAS.map(f => (
          <Link
            key={f.id}
            to={`/finca/${f.id}`}
            className={`${f.color} text-white rounded-2xl shadow-lg p-6 hover:opacity-90 transition`}
          >
            <div className="text-lg font-semibold">{f.name}</div>
            <div className="opacity-80 text-sm">Entrar</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
