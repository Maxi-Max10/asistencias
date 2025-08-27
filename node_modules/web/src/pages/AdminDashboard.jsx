import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API = import.meta.env.VITE_API || "http://127.0.0.1:4000";

/* Small presentational pieces */
function Icon({ name, className = "w-6 h-6" }) {
  const common = `inline-block ${className}`;
  switch (name) {
    case "users":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M16 11a4 4 0 10-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M5 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "check":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "chart":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M3 3v18h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 17V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18 17V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6 17v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case "download":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 3v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 11l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 21H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return null;
  }
}

function StatCard({ title, value, delta, color = "from-indigo-500 to-indigo-400", icon }) {
  return (
    <div className="p-4 rounded-lg shadow-sm bg-gradient-to-br bg-opacity-5 border border-white/5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`rounded-md p-2 text-white shadow-md bg-gradient-to-br ${color}`}>
          {icon}
        </div>
        <div>
          <div className="text-xs text-gray-400">{title}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm ${delta >= 0 ? "text-green-400" : "text-rose-400"}`}>{delta >= 0 ? `+${delta}%` : `${delta}%`}</div>
        <div className="text-xs text-gray-500">vs. semana</div>
      </div>
    </div>
  );
}

/* utility to export recent records as CSV */
function downloadCSV(rows = [], filename = "report.csv") {
  if (!rows || !rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv = [
    keys.join(","),
    ...rows.map(r => keys.map(k => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* Main component */
export default function AdminDashboard() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [range, setRange] = useState("week"); // week | month
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/admin/dashboard?range=${range}`);
        const data = await res.json();
        if (mounted) setStats(data || {});
      } catch (e) {
        console.error("Failed loading dashboard:", e);
        if (mounted) setStats({});
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [range]);

  const weekly = stats?.weekly || { labels: [], filas: [], asistencias: [], meta: [] };
  const topFincas = stats?.topFincas || [];
  const recent = stats?.recent || [];

  const filteredRecent = recent.filter(r => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (String(r.nombre || r.fullname || r.doc || "").toLowerCase().includes(q)
      || String(r.finca || r.crewName || "").toLowerCase().includes(q)
      || String(r.dni || r.doc || "").toLowerCase().includes(q));
  });

  const lineData = useMemo(() => ({
    labels: weekly.labels.length ? weekly.labels : ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"],
    datasets: [
      {
        label: "Filas hechas",
        data: weekly.filas.length ? weekly.filas : [30,45,55,48,62,65,60],
        borderColor: "#60a5fa",
        backgroundColor: "rgba(96,165,250,0.12)",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: "Asistencias",
        data: weekly.asistencias.length ? weekly.asistencias : [6,5,7,6,8,7,6],
        borderColor: "#34d399",
        backgroundColor: "rgba(52,211,153,0.08)",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        yAxisID: 'y1'
      },
      {
        label: "Meta diaria",
        data: weekly.meta.length ? weekly.meta : Array(7).fill(55),
        borderColor: "#f97316",
        borderDash: [6,6],
        backgroundColor: "transparent",
        fill: false,
        pointRadius: 0,
      },
    ],
  }), [weekly]);

  const lineOptions = {
    responsive: true,
    interaction: { mode: "index", intersect: false },
    stacked: false,
    plugins: {
      legend: { position: "top" },
      title: { display: false },
      tooltip: { mode: "index" },
    },
    scales: {
      y: { position: "left", beginAtZero: true, ticks: { color: "#94a3b8" } },
      y1: { position: "right", grid: { drawOnChartArea: false }, beginAtZero: true, ticks: { color: "#94a3b8" } },
      x: { ticks: { color: "#94a3b8" } },
    },
  };

  const barData = useMemo(() => ({
    labels: (topFincas.length ? topFincas.map(f=>f.name) : ["Los Álamos","El Sol","Las Nubes"]),
    datasets: [
      {
        label: "Filas por finca",
        data: (topFincas.length ? topFincas.map(f=>f.filas) : [120,98,76]),
        backgroundColor: ["#6366f1","#ef4444","#f59e0b"],
      },
    ],
  }), [topFincas]);

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">Dashboard — Administrador</h1>
          <p className="text-sm text-gray-500 mt-1">Visión general con métricas, fincas top y registros recientes</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/6 rounded-lg px-2 py-1">
            <button
              onClick={() => setRange("week")}
              className={`px-3 py-1 rounded ${range === "week" ? "bg-indigo-600 text-white" : "text-gray-300"}`}
            >
              Semana
            </button>
            <button
              onClick={() => setRange("month")}
              className={`px-3 py-1 rounded ${range === "month" ? "bg-indigo-600 text-white" : "text-gray-300"}`}
            >
              Mes
            </button>
          </div>

          <button
            onClick={() => downloadCSV(recent, `recent-${new Date().toISOString().slice(0,10)}.csv`)}
            className="flex items-center gap-2 bg-white/5 border border-white/6 text-sm rounded px-3 py-2 hover:bg-white/6"
            title="Exportar registros"
          >
            <Icon name="download" className="w-4 h-4" />
            Exportar
          </button>

          <button
            onClick={() => logout && logout()}
            className="text-sm px-3 py-2 border rounded hover:bg-red-50"
            title="Cerrar sesión"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Asistencias (Cuadrilleros)"
          value={stats?.totalAsistencias ?? 0}
          delta={stats?.deltas?.asistencias ?? 4}
          color="from-indigo-500 to-indigo-400"
          icon={<Icon name="check" />}
        />
        <StatCard
          title="Cuadrilleros"
          value={stats?.cuadrillerosUnicos ?? 0}
          delta={stats?.deltas?.cuadrilleros ?? 1}
          color="from-emerald-400 to-emerald-500"
          icon={<Icon name="users" />}
        />
        <StatCard
          title="Filas hechas"
          value={stats?.filasHechas ?? 0}
          delta={stats?.deltas?.filas ?? 6}
          color="from-yellow-400 to-orange-400"
          icon={<Icon name="chart" />}
        />
        <StatCard
          title="Prom. filas/cuadrillero"
          value={stats?.promFilasCuadrillero ? Number(stats.promFilasCuadrillero).toFixed(1) : "0.0"}
          delta={stats?.deltas?.prom ?? 0}
          color="from-rose-500 to-pink-500"
          icon={<Icon name="chart" />}
        />
      </div>

      {/* Charts + side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white/5 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Estado de la cosecha</h3>
            <div className="text-sm text-gray-500">Últimos datos</div>
          </div>
          <div style={{ height: 320 }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        <div className="bg-white/5 p-4 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Top fincas</h3>
            <div className="text-sm text-gray-500">Filas</div>
          </div>
          <div style={{ height: 240 }}>
            <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
          </div>

          <div className="mt-4">
            {topFincas.length ? (
              topFincas.map((f, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-gradient-to-br from-indigo-600 to-pink-500 text-white flex items-center justify-center text-sm font-semibold">
                      {String(f.name || "").slice(0,1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{f.name}</div>
                      <div className="text-xs text-gray-400">{f.location ?? ""}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{f.filas}</div>
                    <div className="text-xs text-gray-400">{f.asistencias ?? 0} as.</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">No hay datos de fincas.</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent table with search */}
      <div className="bg-white/5 p-4 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
          <h3 className="text-lg font-semibold">Registros recientes</h3>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nombre, DNI o finca..."
              className="bg-transparent border border-white/6 px-3 py-2 rounded text-sm w-64 focus:outline-none"
            />
            <button
              onClick={() => downloadCSV(filteredRecent, `recent-${new Date().toISOString().slice(0,10)}.csv`)}
              className="text-sm px-3 py-2 border rounded hover:bg-white/6 flex items-center gap-2"
            >
              <Icon name="download" className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="text-xs text-gray-400 uppercase">
              <tr>
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">DNI</th>
                <th className="py-2 pr-4">Cuadrilla</th>
                <th className="py-2 pr-4">Finca</th>
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Asistencias</th>
                <th className="py-2 pr-4">Filas</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredRecent.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-gray-500">No hay registros</td>
                </tr>
              ) : filteredRecent.map((r, i) => (
                <tr key={r.id ?? i} className="border-t border-white/5">
                  <td className="py-3 pr-4 font-medium">{r.nombre ?? r.fullname ?? r.doc ?? "-"}</td>
                  <td className="py-3 pr-4">{r.dni ?? r.doc ?? "-"}</td>
                  <td className="py-3 pr-4">{r.cuadrilla ?? r.crewName ?? "-"}</td>
                  <td className="py-3 pr-4">{r.finca ?? r.location ?? "-"}</td>
                  <td className="py-3 pr-4">{r.fecha ? new Date(r.fecha).toLocaleString("es-AR") : "-"}</td>
                  <td className="py-3 pr-4">{r.asistencias ?? 0}</td>
                  <td className="py-3 pr-4">{r.filas ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}