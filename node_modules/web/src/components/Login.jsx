import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (user === "cuadrillero" && pass === "cuadri12") {
      onLogin("cuadrillero");
    } else if (user === "admin" && pass === "admin") {
      onLogin("admin");
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="border rounded p-6 bg-white shadow-md">
        <h2 className="text-lg font-bold mb-4">Iniciar sesión</h2>
        <input
          className="border p-2 mb-2 w-full"
          placeholder="Usuario"
          value={user}
          onChange={e => setUser(e.target.value)}
        />
        <input
          className="border p-2 mb-2 w-full"
          placeholder="Contraseña"
          type="password"
          value={pass}
          onChange={e => setPass(e.target.value)}
        />
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
        <button className="bg-blue-600 text-white px-4 py-2 rounded w-full" type="submit">
          Entrar
        </button>
      </form>
    </div>
  );
}