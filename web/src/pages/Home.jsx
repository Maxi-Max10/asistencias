import Login from "../components/Login.jsx";
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const FINCAS = [
  { id: 1, name: "Finca A", color: "bg-blue-600" },
  { id: 2, name: "Finca B", color: "bg-green-600" },
  { id: 3, name: "Finca C", color: "bg-purple-600" },
  { id: 4, name: "Finca D", color: "bg-amber-600" },
  { id: 5, name: "Finca E", color: "bg-rose-600" },
];

export default function Home() {
  const { logout } = useAuth();
  const role =
    typeof window !== "undefined" ? window.localStorage.getItem("role") : null;

  if (!role) {
    return (
      <Login
        onLogin={(r) => {
          window.localStorage.setItem("role", r);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen p-6 flex flex-col gap-6">
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <h1 className="text-2xl font-bold">¡Bienvenidos! Seleccione finca</h1>
        <button onClick={() => logout && logout()}>Cerrar sesión</button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FINCAS.map((f) => (
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
