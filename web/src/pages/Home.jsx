import Login from "../components/Login.jsx";
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API || "http://127.0.0.1:4000";

// Las fincas (crews) ahora vienen de la base de datos vía API

const palette = [
  "bg-slate-900 text-white",   // Finca A
  "bg-indigo-900 text-white",  // Finca B
  "bg-emerald-900 text-white", // Finca C
  "bg-rose-900 text-white",    // Finca D
  "bg-amber-900 text-white",   // Finca E
  "bg-cyan-900 text-white",    // Extra (if more fincas)
  "bg-fuchsia-900 text-white", // Extra
  "bg-lime-900 text-white",    // Extra
];

// Mapeo de color por id (se construye cuando cargamos crews)

export default function Home() {
  const role =
    typeof window !== "undefined" ? window.localStorage.getItem("role") : null;

  const [query, setQuery] = useState("");
  const [summary, setSummary] = useState(null); // array o objeto por crew
  const [loading, setLoading] = useState(false);
  const [greeting, setGreeting] = useState("¡Bienvenidos!");
  const [crews, setCrews] = useState([]);
  const [colorById, setColorById] = useState({});

  // Calcula saludo según hora de Argentina
  const computeArgentinaGreeting = () => {
    try {
      const hourStr = new Intl.DateTimeFormat("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        hour: "2-digit",
        hour12: false,
      }).format(new Date());
      const hour = parseInt(hourStr, 10);
      if (hour >= 6 && hour < 12) return "Buenos días";
      if (hour >= 12 && hour < 19) return "Buenas tardes";
      return "Buenas noches";
    } catch {
      const h = new Date().getHours();
      if (h >= 6 && h < 12) return "Buenos días";
      if (h >= 12 && h < 19) return "Buenas tardes";
      return "Buenas noches";
    }
  };

  useEffect(() => {
    if (!role) return;
    const run = async () => {
      try {
        setLoading(true);
        // Cargar crews desde la base para reflejar fincas reales
        const rc = await fetch(`${API}/api/crews`, { cache: "no-store" });
        const crewsData = await rc.json();
        const arr = Array.isArray(crewsData) ? crewsData : [];
        setCrews(arr);
        setColorById(Object.fromEntries(arr.map((f, i) => [f.id, palette[i % palette.length]])));

        const r = await fetch(`${API}/api/attendance/summary`);
        const data = await r.json();
        setSummary(Array.isArray(data) ? data : []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    run();
  }, [role]);

  useEffect(() => {
    setGreeting(computeArgentinaGreeting());
    // refresca saludo cada 5 minutos por si cambia franja
    const id = setInterval(() => setGreeting(computeArgentinaGreeting()), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return crews;
    return crews.filter(f => (f.name || '').toLowerCase().includes(q) || String(f.id).includes(q));
  }, [query, crews]);

  const getMetrics = (id) => {
    if (!Array.isArray(summary)) return null;
    return summary.find(s => Number(s.crewId) === Number(id)) || null;
  };

  const getMapClickUrl = (f) => {
    if (!f) return null;
    if (f.map_url) return f.map_url;
    if (f.lat != null && f.lng != null) return `https://www.google.com/maps?q=${f.lat},${f.lng}`;
    return null;
  };

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
    <div className="min-h-screen bg-white antialiased">
      {/* Full-width banner with background image */}
      <div className="w-full relative">
        <img src="/banner.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60" />
  <div className="relative max-w-6xl mx-auto px-4 h-48 sm:h-64 flex items-center justify-center text-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">{greeting}! Seleccione finca</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">

        {/* Search + refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o número de finca..."
              className="w-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>
          <button
            onClick={async () => {
              try {
                setLoading(true);
                const r = await fetch(`${API}/api/attendance/summary`);
                const data = await r.json();
                setSummary(Array.isArray(data) ? data : []);
              } finally { setLoading(false); }
            }}
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a1 1 0 011-1h2a1 1 0 110 2H6.414l1.293 1.293a7 7 0 11-2 2L4 7.414V9a1 1 0 11-2 0V5a1 1 0 011-1zm10 8a5 5 0 10-4.546 4.978L9 16l3 3-3 3-.454-1.022A7 7 0 1116 12z" clipRule="evenodd"/></svg>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {/* Grid of fincas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((f) => {
            const m = getMetrics(f.id);
            return (
              <Link
                key={f.id}
                to={`/finca/${f.id}`}
                className={`${colorById[f.id] || palette[(Number(f.id)-1) % palette.length]} rounded-2xl shadow-lg p-5 hover:shadow-xl transition group`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold">{f.name}</div>
                  </div>
                  {getMapClickUrl(f) && (
                    <button
                      type="button"
                      onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); window.open(getMapClickUrl(f), "_blank", "noopener,noreferrer"); }}
                      title="Abrir ubicación en Google Maps"
                      aria-label={`Abrir ubicación de ${f.name} en Google Maps`}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white shadow-sm"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2C8.686 2 6 4.686 6 8c0 4.385 5.19 9.53 5.41 9.745.323.315.857.315 1.18 0C12.81 17.53 18 12.385 18 8c0-3.314-2.686-6-6-6zm0 8.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z"/>
                      </svg>
                    </button>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-white/10 rounded-lg p-2 text-center">
                    <div className="text-xs opacity-80">Presentes</div>
                    <div className="font-bold">{m?.present ?? '-'}</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2 text-center">
                    <div className="text-xs opacity-80">Ausentes</div>
                    <div className="font-bold">{m?.absent ?? '-'}</div>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2 text-center">
                    <div className="text-xs opacity-80">Pendiente</div>
                    <div className="font-bold">{m?.pending ?? '-'}</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs opacity-90">
                  <div>Total: <span className="font-semibold">{m?.totalWorkers ?? '-'}</span></div>
                  <div className="opacity-80">Registrados: <span className="font-semibold">{m?.recorded ?? '-'}</span></div>
                </div>

                <div className="mt-4 w-full flex items-center justify-center gap-2 text-sm font-medium text-black bg-white px-3 py-2 rounded-lg group-hover:translate-x-0.5 transition">
                  Entrar
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
