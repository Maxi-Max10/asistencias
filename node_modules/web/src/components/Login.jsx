import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import preloadGif from "../assets/about.gif";

export default function Login() {
  const { login } = useAuth();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mostrar el GIF al menos 4000ms (4s) como splash
    const start = Date.now();
    const img = new Image();
    let onloadTimeout = null;
    // fallback para asegurar que no se quede forever
    const fallback = setTimeout(() => setLoading(false), 4000);

    img.src = preloadGif;
    img.onload = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 4000 - elapsed);
      clearTimeout(fallback);
      onloadTimeout = setTimeout(() => setLoading(false), remaining);
    };
    img.onerror = () => {
      // si falla la carga, igual esperar 4s desde el inicio
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 4000 - elapsed);
      clearTimeout(fallback);
      onloadTimeout = setTimeout(() => setLoading(false), remaining);
    };

    return () => {
      clearTimeout(onloadTimeout);
      clearTimeout(fallback);
    };
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (user === "cuadrillero" && pass === "cuadri12") return login("cuadrillero");
    if (user === "admin" && pass === "admin") return login("admin");
    alert("Credenciales inválidas");
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "rgb(254,255,255)" }} // fondo requerido
      >
        <div className="flex flex-col items-center gap-6">
          <img src={preloadGif} alt="Cargando..." className="w-48 h-48 object-contain" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="backdrop-blur-sm bg-white/6 border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-10 transform transition duration-500 ease-out hover:scale-[1.01]">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-lg">
              A
            </div>
            <div>
              <h1 className="text-white text-2xl font-extrabold">Acceder</h1>
              <p className="text-sm text-gray-300">Inicia sesión con tu usuario</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="relative block">
              <input
                className="peer w-full bg-white/5 border border-white/10 rounded-lg pt-6 pb-3 px-4 text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                placeholder=" "
                value={user}
                onChange={(e) => setUser(e.target.value)}
                aria-label="Usuario"
              />
              <span
                className={
                  "pointer-events-none absolute left-4 transition-all text-gray-300 " +
                  (user ? "top-1 text-xs" : "top-1/2 -translate-y-1/2 text-base")
                }
              >
                Usuario
              </span>
            </label>

            <label className="relative block">
              <input
                type="password"
                className="peer w-full bg-white/5 border border-white/10 rounded-lg pt-6 pb-3 px-4 text-white placeholder-transparent focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
                placeholder=" "
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                aria-label="Contraseña"
              />
              <span
                className={
                  "pointer-events-none absolute left-4 transition-all text-gray-300 " +
                  (pass ? "top-1 text-xs" : "top-1/2 -translate-y-1/2 text-base")
                }
              >
                Contraseña
              </span>
            </label>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg py-3 px-4 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-semibold shadow hover:scale-[1.01] active:scale-95 transition"
            >
              Entrar
            </button>
          </form>

          <div className="mt-6 text-xs text-gray-400">
            <div>Credenciales de prueba:</div>
            <div className="mt-2 flex gap-3">
              <span className="px-2 py-1 bg-white/5 rounded">cuadrillero / cuadri12</span>
              <span className="px-2 py-1 bg-white/5 rounded">admin / admin</span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">© {new Date().getFullYear()} Asistencias</p>
      </div>
    </div>
  );
}