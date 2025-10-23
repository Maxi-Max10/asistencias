import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import preloadGif from "../assets/about.gif";

export default function Login() {
  const { login } = useAuth();
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showCredentials, setShowCredentials] = useState(false);

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

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    // Simular un pequeño delay para mejor UX
    await new Promise(resolve => setTimeout(resolve, 800));

    if (user === "cuadrillero" && pass === "cuadri12") {
      login("cuadrillero");
    } else if (user === "admin" && pass === "admin") {
      login("admin");
    } else {
      setError("Credenciales inválidas. Por favor, verifica tu usuario y contraseña.");
    }
    
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" style={{ backgroundColor: "rgb(254,255,255)" }}>
        <img src={preloadGif} alt="Cargando" className="w-32 h-32 sm:w-48 sm:h-48 object-contain" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="bg-black rounded-2xl shadow-2xl p-6 sm:p-8 transform transition-all duration-300 hover:shadow-3xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl flex items-center justify-center text-black text-2xl sm:text-3xl font-bold mx-auto mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-white text-2xl sm:text-3xl font-bold mb-2">
              Bienvenido
            </h1>
            <p className="text-sm text-gray-300">Accede a tu sistema de asistencias</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-sm animate-shake">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {/* Usuario field */}
            <div className="relative">
              <input
                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-200"
                placeholder="Usuario"
                value={user}
                onChange={(e) => {
                  setUser(e.target.value);
                  setError("");
                }}
                aria-label="Usuario"
                disabled={isSubmitting}
              />
            </div>

            {/* Contraseña field */}
            <div className="relative">
              <input
                type="password"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent transition-all duration-200"
                placeholder="Contraseña"
                value={pass}
                onChange={(e) => {
                  setPass(e.target.value);
                  setError("");
                }}
                aria-label="Contraseña"
                disabled={isSubmitting}
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || !user || !pass}
              className="w-full bg-white text-black font-semibold py-3 px-4 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verificando...
                </>
              ) : (
                <>
                  
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Credenciales de prueba */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowCredentials(!showCredentials)}
              className="w-full text-xs text-gray-400 hover:text-gray-300 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg className={`w-4 h-4 transition-transform duration-200 ${showCredentials ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Credenciales de prueba
            </button>
            
            <div className={`transition-all duration-300 overflow-hidden ${showCredentials ? 'max-h-40 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700">
                  <div className="text-sm">
                    <div className="text-white font-medium">Cuadrillero</div>
                    <div className="text-gray-400 text-xs">cuadrillero / cuadri12</div>
                  </div>
                  <button
                    onClick={() => {
                      setUser("cuadrillero");
                      setPass("cuadri12");
                    }}
                    className="text-xs text-white hover:text-gray-300 transition-colors bg-gray-800 px-2 py-1 rounded"
                  >
                    Usar
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700">
                  <div className="text-sm">
                    <div className="text-white font-medium">Administrador</div>
                    <div className="text-gray-400 text-xs">admin / admin</div>
                  </div>
                  <button
                    onClick={() => {
                      setUser("admin");
                      setPass("admin");
                    }}
                    className="text-xs text-white hover:text-gray-300 transition-colors bg-gray-800 px-2 py-1 rounded"
                  >
                    Usar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Sistema de Asistencias
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Versión 2.0
          </p>
        </div>
      </div>
    </div>
  );
}