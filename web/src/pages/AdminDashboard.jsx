import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

// shadcn/ui + lucide-react
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Download, LogOut, Users, Check, BarChart2, Users2, Bell } from "lucide-react";
import { Link } from "react-router-dom";

// API base: dev -> localhost:4000, prod -> mismo origen
const API = (import.meta.env.VITE_API ?? (import.meta.env.DEV ? "http://127.0.0.1:4000" : ""));

/* ========================== Helpers ========================== */
function todayLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toISODate(d) {
  if (!d) return "";
  if (typeof d === "string") {
    const s = d.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    try { return new Date(d).toISOString().slice(0, 10); } catch { return ""; }
  }
  try { return new Date(d).toISOString().slice(0, 10); } catch { return ""; }
}

// "Cuadrilla 3", "C3", "3" -> "Finca 3"
function asFincaName(raw) {
  if (raw == null || raw === "-") return "-";
  const s = String(raw).trim();
  const m = s.match(/\d+$/);
  const num = m ? m[0] : "";
  if (/^cuadrilla/i.test(s)) return `Finca ${num || s.replace(/^cuadrilla/i, "").trim()}`;
  if (/^c\d+$/i.test(s)) return `Finca ${s.slice(1)}`;
  if (/^\d+$/.test(s)) return `Finca ${s}`;
  if (/^finca/i.test(s)) return s;
  return s;
}

function getFincaId(r) {
  const v =
    r?.fincaId ??
    r?.finca ??
    r?.locationId ??
    r?.location ??
    r?.crewId ??
    r?.crew_id ??
    "-";
  if (v == null || v === "-") return "-";
  const match = String(v).match(/\d+/);
  return match ? match[0] : String(v);
}

function getAsistencias(r) {
  if (!r) return 0;
  if (r.asistencias != null && !isNaN(Number(r.asistencias))) return Number(r.asistencias);
  if (r.asistencia  != null && !isNaN(Number(r.asistencia)))  return Number(r.asistencia);
  if (r.attendances != null && !isNaN(Number(r.attendances))) return Number(r.attendances);
  const s = String(r.asistencia ?? r.status ?? "").toLowerCase().trim();
  if (s === "present" || s === "presente" || s === "si" || s === "sí") return 1;
  if (s === "absent"  || s === "ausente"  || s === "no") return 0;
  if (typeof r.present === "boolean") return r.present ? 1 : 0;
  if (!isNaN(Number(r.filas)) && Number(r.filas) > 0) return 1;
  return 0;
}

/* ========================== CSV export ========================== */
function downloadCSV(rows = [], filename = "report.csv") {
  if (!rows || !rows.length) return;
  const keys = Object.keys(rows[0] || {});
  if (!keys.length) return;
  const csv = [
    keys.join(","),
    ...rows.map((r) =>
      keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ============================ UI bits ============================ */
function DeltaBadge({ value }) {
  const n = Number(value ?? 0);
  const pos = n >= 0;
  return (
    <Badge
      variant={pos ? "default" : "destructive"}
      className={pos ? "bg-emerald-600 hover:bg-emerald-600/90" : ""}
    >
      {pos ? "▲" : "▼"} {pos ? `+${n}%` : `${n}%`}
    </Badge>
  );
}

function SurfaceCard({ className = "", children }) {
  return (
    <Card className={`border-white/10 bg-[#242A38] shadow-lg shadow-black/30 ${className}`}>
      {children}
    </Card>
  );
}

function Kpi({ title, value, delta, icon, gradient = "from-indigo-500 to-indigo-400" }) {
  return (
    <SurfaceCard>
      <CardContent className="p-4">
  <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2.5 text-white shadow bg-gradient-to-br ${gradient}`}>
            {icon}
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-400">{title}</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-2xl font-extrabold tracking-tight text-slate-100">{value}</p>
              <DeltaBadge value={delta} />
            </div>
          </div>
        </div>
      </CardContent>
    </SurfaceCard>
  );
}

/* ============================== Vista ============================== */
export default function AdminDashboard() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [range, setRange] = useState("week");
  const [query, setQuery] = useState("");
  const [day, setDay] = useState(todayLocal());
  const [showNotif, setShowNotif] = useState(false);
  const [newWorkers, setNewWorkers] = useState([]);

  // Cargar crews para mapear nombres en listados recientes
  const [crews, setCrews] = useState([]);
  useEffect(() => {
    let cancelled = false;
    async function loadCrews(){
      try{
        const r = await fetch(`${API}/api/crews`, { cache: "no-store" });
        const data = await r.json();
        if (!cancelled) setCrews(Array.isArray(data) ? data : []);
      }catch{ if (!cancelled) setCrews([]); }
    }
    loadCrews();
    return () => { cancelled = true; };
  }, []);
  const crewNameById = useMemo(() => Object.fromEntries(crews.map(c => [String(c.id), c.name])), [crews]);

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

  // ===== Notificaciones: nuevos trabajadores
  useEffect(() => {
    // Initialize last seen on first visit to avoid historical flood
    const key = "admin.newWorkers.lastSeen";
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, new Date().toISOString());
    }
    let cancelled = false;
    async function checkOnce() {
      try {
        const since = localStorage.getItem(key) || new Date().toISOString();
        const r = await fetch(`${API}/api/workers?createdSince=${encodeURIComponent(since)}`, { cache: "no-store" });
        const data = await r.json();
        if (!cancelled) setNewWorkers(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setNewWorkers([]);
      }
    }
    checkOnce();
    const id = setInterval(checkOnce, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const unreadCount = newWorkers.length;
  function markAllSeen() {
    localStorage.setItem("admin.newWorkers.lastSeen", new Date().toISOString());
    setNewWorkers([]);
    setShowNotif(false);
  }


  const weekly = stats?.weekly || { labels: [], filas: [], asistencias: [], meta: [] };
  const topFincasRaw = stats?.topFincas || [];          // <-- UNA sola vez
  const recent = stats?.recent || [];

  const filteredRecent = recent
    .filter((r) => {
      if (!day) return true;
      const raw = r?.date ?? r?.fecha ?? "";
      if (!raw) return false;
      const s = String(raw).slice(0, 10);
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : toISODate(raw);
      return iso === day;
    })
    .filter((r) => {
      if (!query) return true;
      const q = query.toLowerCase();
      const crewNm = crewNameById[String(r.crewId ?? r.crew_id ?? "")] || asFincaName(r.finca ?? r.crewName ?? r.crewId ?? r.crew_id ?? "-");
      return (
        String(r.nombre || r.fullname || r.doc || "").toLowerCase().includes(q) ||
        String(r.dni || r.doc || "").toLowerCase().includes(q) ||
        String(crewNm).toLowerCase().includes(q)
      );
    });

  const lineData = useMemo(
    () =>
      (weekly.labels.length
        ? weekly.labels
        : ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]).map((d, i) => ({
        dia: d,
        filas: Number(weekly.filas?.[i] ?? [30, 45, 55, 48, 62, 65, 60][i] ?? 0),
        asistencias: Number(weekly.asistencias?.[i] ?? [6, 5, 7, 6, 8, 7, 6][i] ?? 0),
        meta: Number(weekly.meta?.[i] ?? 55),
      })),
    [weekly]
  );

  const barData = useMemo(
    () =>
      (topFincasRaw.length
        ? topFincasRaw
        : [
            { name: "Cuadrilla 1", filas: 7, asistencias: 6 },
            { name: "Cuadrilla 4", filas: 3, asistencias: 2 },
            { name: "Cuadrilla 2", filas: 2, asistencias: 2 },
            { name: "Cuadrilla 3", filas: 2, asistencias: 2 },
            { name: "Cuadrilla 5", filas: 1, asistencias: 1 },
          ]
      ).map((f) => {
        const fallback = asFincaName(f.name ?? f.finca ?? f.crewName ?? f.crewId ?? f.crew_id ?? "-");
        const mapped = crewNameById[String(f.crewId ?? f.crew_id ?? f.id ?? "")] || fallback;
        return {
          name: mapped,
        filas: Number(f.filas ?? 0),
        asistencias: Number(f.asistencias ?? 0),
        };
      }),
    [topFincasRaw, crewNameById]
  );

  if (loading) {
    return (
      <div className="min-h-screen p-6 text-slate-200" style={{ backgroundColor: "rgb(30,34,43)" }}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-white/10 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-24 bg-white/10 rounded-xl"></div>
            <div className="h-24 bg-white/10 rounded-xl"></div>
            <div className="h-24 bg-white/10 rounded-xl"></div>
            <div className="h-24 bg-white/10 rounded-xl"></div>
          </div>
          <div className="h-64 bg-white/10 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 text-slate-200" style={{ backgroundColor: "rgb(30,34,43)" }}>
      {/* Topbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs text-slate-400">
            <span>Inicio</span>
            <span>›</span>
            <span className="text-slate-200/90">Panel</span>
          </div>
          <h1 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight text-white">Dashboard — Administrador</h1>
          <p className="text-sm text-slate-400 mt-1">Métricas, fincas top y registros recientes</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Bell notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotif((v) => !v)}
              className={`relative h-9 w-9 rounded-md border bg-[#2A3040] hover:bg-[#343B4E] flex items-center justify-center 
                ${unreadCount > 0 ? 'border-amber-400/50 ring-2 ring-amber-400/40' : 'border-white/10'}
              `}
              title="Notificaciones de nuevos trabajadores"
            >
              <Bell className={`h-4 w-4 ${unreadCount > 0 ? 'text-amber-300' : 'text-amber-300'}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center border border-white/20">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotif && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-30 w-[min(90vw,20rem)] sm:w-80 rounded-lg border border-white/10 bg-[#242A38] shadow-lg shadow-black/30">
                <div className="p-3 border-b border-white/10 flex items-center justify-between">
                  <div className="font-semibold text-slate-100 text-sm">Nuevos trabajadores</div>
                  <button onClick={markAllSeen} className="text-xs text-indigo-300 hover:text-indigo-200">Marcar todo visto</button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {unreadCount === 0 ? (
                    <div className="p-3 text-xs text-slate-400">No hay novedades.</div>
                  ) : (
                    newWorkers.map((w) => (
                      <div key={w.id} className="px-3 py-2 text-sm text-slate-200 border-b border-white/5">
                        <div className="font-medium">{w.fullname || w.doc}</div>
                        <div className="text-[11px] text-slate-400">DNI: {w.doc || '-'} • Finca: {w.crew_name || w.crew_id}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v)}
            className="rounded-xl border border-white/10 bg-[#2A3040] p-1"
          >
            <ToggleGroupItem value="week" className="data-[state=on]:bg-indigo-600 data-[state=on]:text-white text-slate-200">
              Semana
            </ToggleGroupItem>
            <ToggleGroupItem value="month" className="data-[state=on]:bg-indigo-600 data-[state=on]:text-white text-slate-200">
              Mes
            </ToggleGroupItem>
          </ToggleGroup>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="h-9 rounded-md border border-white/10 bg-[#2A3040] px-3 text-sm text-slate-200 placeholder:text-slate-400"
            title="Filtrar por día"
          />
          <Button
            variant="secondary"
            className="border-white/10 bg-[#2A3040] text-slate-200 hover:bg-[#343B4E]"
            onClick={() => downloadCSV(filteredRecent, `recent-${day}.csv`)}
          >
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Link to="/admin/workers">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Users className="mr-2 h-4 w-4" /> Trabajadores
            </Button>
          </Link>
          <Link to="/admin/crews">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
              <Users2 className="mr-2 h-4 w-4" /> Fincas
            </Button>
          </Link>

          {/* Cerrar sesión ahora vive en la TopNav solo para Admin */}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Kpi title="Total Asistencias (Cuadrilleros)" value={stats?.totalAsistencias ?? 0} delta={stats?.deltas?.asistencias ?? 4} gradient="from-indigo-500 to-indigo-400" icon={<Check size={18} />} />
        <Kpi title="Cuadrilleros" value={stats?.cuadrillerosUnicos ?? 0} delta={stats?.deltas?.cuadrilleros ?? 1} gradient="from-emerald-400 to-emerald-500" icon={<Users size={18} />} />
        <Kpi title="Filas hechas" value={stats?.filasHechas ?? 0} delta={stats?.deltas?.filas ?? 6} gradient="from-amber-400 to-orange-500" icon={<BarChart2 size={18} />} />
        <Kpi title="Prom. filas/cuadrillero" value={stats?.promFilasCuadrillero ? Number(stats.promFilasCuadrillero).toFixed(1) : "0.0"} delta={stats?.deltas?.prom ?? 0} gradient="from-fuchsia-500 to-pink-500" icon={<BarChart2 size={18} />} />
      </div>

      {/* Chart full width */}
      <div className="mb-6">

{/* ====== Estado de la cosecha (nuevo estilo) ====== */}
<SurfaceCard className="w-full">
  <CardHeader className="pb-0">
    <div className="flex items-start justify-between gap-4">
      <div>
        <CardTitle className="text-slate-100 text-[28px] leading-tight">
          Estado de la Cosecha
        </CardTitle>
        <CardDescription className="text-slate-400">
          Temporada: {new Date().toLocaleString("es-AR", { month: "long", year: "numeric" })}
        </CardDescription>
      </div>

      {/* Controles estilo Hoy / Semana / Mes / Año */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className={`h-8 rounded-md border-white/10 text-slate-200 bg-[#2A3040] ${
            range === "today" ? "bg-indigo-600 text-white border-transparent" : ""
          }`}
          onClick={() => setRange("today")} disabled
          title="(Deshabilitado por ahora)"
        >
          Hoy
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={`h-8 rounded-md border-white/10 text-slate-200 bg-[#2A3040] ${
            range === "week" ? "bg-indigo-600 text-white border-transparent" : ""
          }`}
          onClick={() => setRange("week")}
        >
          Semana
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={`h-8 rounded-md border-white/10 text-slate-200 bg-[#2A3040] ${
            range === "month" ? "bg-indigo-600 text-white border-transparent" : ""
          }`}
          onClick={() => setRange("month")}
        >
          Mes
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={`h-8 rounded-md border-white/10 text-slate-200 bg-[#2A3040] ${
            range === "year" ? "bg-indigo-600 text-white border-transparent" : ""
          }`}
          onClick={() => setRange("year")} disabled
          title="(Deshabilitado por ahora)"
        >
          Año
        </Button>

        <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white" title="Exportar imagen (pendiente)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mr-0.5">
            <path d="M12 5v10m0 0l-4-4m4 4l4-4M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Button>
      </div>
    </div>
  </CardHeader>

  <CardContent className="pt-4">
    <div style={{ height: 420 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={lineData}
          margin={{ top: 12, right: 28, left: 8, bottom: 8 }}
        >
          {/* Gradientes para rellenos suaves */}
          <defs>
            <linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7287FD" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7287FD" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="fillGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#34D399" stopOpacity="0.03" />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="dia" stroke="#A3B1C6" tickLine={false} axisLine={false} />
          <YAxis
            yAxisId="left"
            stroke="#A3B1C6"
            tickLine={false}
            axisLine={false}
            domain={[0, (dataMax) => Math.max(60, Math.ceil((dataMax + 5) / 5) * 5)]}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#A3B1C6"
            tickLine={false}
            axisLine={false}
            domain={[0, (dataMax) => Math.max(10, Math.ceil((dataMax + 1) / 1) * 1)]}
          />

          {/* Tooltip dark */}
          <Tooltip
            contentStyle={{
              backgroundColor: "#242A38",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#E5E7EB",
            }}
            formatter={(v, name) =>
              typeof v === "number" ? [v.toLocaleString("es-AR"), name] : [v, name]
            }
          />

          {/* Leyenda custom (cajas de color + línea punteada) */}
          {/* Leyenda custom (centrada) */}
          <Legend
            verticalAlign="top"
            height={40}
            content={() => (
              <div className="flex w-full items-center justify-center gap-8 px-2 pb-2 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-5 rounded-sm"
                    style={{ background: "#7287FD" }}
                  />
                  <span className="text-slate-200">Filas hechas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-5 rounded-sm"
                    style={{ background: "#34D399" }}
                  />
                  <span className="text-slate-200">Asistencias</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-[2px] w-5 border-t border-dashed"
                    style={{ borderColor: "#F87171" }}
                  />
                  <span className="text-slate-200">Meta diaria</span>
                </div>
              </div>
            )}
          />


          {/* Línea meta punteada (misma altura que tu weekly.meta promedio o 55 por defecto) */}
          <ReferenceLine
            y={Number(weekly.meta?.[0] ?? 55)}
            yAxisId="left"
            stroke="#F87171"
            strokeDasharray="8 6"
          />

          {/* Filas (línea azul con área) */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="filas"
            name="Filas hechas"
            stroke="#7287FD"
            strokeWidth={2.6}
            dot={{ r: 3, stroke: "#7287FD", strokeWidth: 1.5, fill: "#0f172a" }}
            activeDot={{ r: 5 }}
            fill="url(#fillBlue)"
            fillOpacity={1}
          />

          {/* Asistencias (línea verde con área) */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="asistencias"
            name="Asistencias"
            stroke="#34D399"
            strokeWidth={2.2}
            dot={{ r: 3, stroke: "#34D399", strokeWidth: 1.4, fill: "#0f172a" }}
            activeDot={{ r: 5 }}
            fill="url(#fillGreen)"
            fillOpacity={1}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</SurfaceCard>

      </div>

      {/* Top fincas */}
      <div className="mb-6">
        <SurfaceCard className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100">Top fincas</CardTitle>
            <CardDescription className="text-slate-400">Por filas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" stroke="#A3B1C6" tickLine={false} axisLine={false} />
                  <YAxis stroke="#A3B1C6" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#242A38", border: "1px solid rgba(255,255,255,0.08)", color: "#E5E7EB" }} />
                  <Bar dataKey="filas" name="Filas por finca" radius={[10, 10, 0, 0]} fill="#7287FD" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Separator className="my-4 bg-white/10" />
            <div className="divide-y divide-white/10">
              {barData.length ? (
                barData.map((f, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-pink-500 text-white flex items-center justify-center text-sm font-semibold">
                        F
                      </div>
                      <div>
                        <div className="font-medium leading-tight text-slate-100">{f.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-100">{f.filas}</div>
                      <div className="text-xs text-slate-400">{f.asistencias ?? 0} as.</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-400">No hay datos de fincas.</div>
              )}
            </div>
          </CardContent>
        </SurfaceCard>
      </div>

      {/* Registros recientes */}
      <SurfaceCard className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-slate-100">Registros recientes</CardTitle>
          <CardDescription className="text-slate-400">Últimas cargas y asistencias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nombre, DNI o finca..."
              className="w-64 bg-[#2A3040] border-white/10 text-slate-200 placeholder:text-slate-400"
            />
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="h-9 rounded-md border border-white/10 bg-[#2A3040] px-3 text-sm text-slate-200 placeholder:text-slate-400"
              title="Filtrar por día"
            />
            <Button variant="outline" className="border-white/10 text-slate-200 hover:bg-[#343B4E]" onClick={() => downloadCSV(filteredRecent, `recent-${day}.csv`)}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <div className="max-h[480px] min-h-[320px] overflow-y-scroll rounded-md border border-white/10">
              <Table className="table-fixed">
                <TableHeader className="sticky top-0 bg-[#2A3040] z-10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[22%] text-slate-300">Nombre</TableHead>
                    <TableHead className="w-[14%] text-slate-300">DNI</TableHead>
                    <TableHead className="w-[18%] text-slate-300">Finca</TableHead>
                    <TableHead className="w-[18%] text-slate-300">Fecha</TableHead>
                    <TableHead className="w-[7%] text-right text-slate-300">Asist.</TableHead>
                    <TableHead className="w-[7%] text-right text-slate-300">Filas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-slate-400 py-6">
                        No hay registros
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecent.map((r, i) => {
                      const raw = r?.date ?? r?.fecha ?? "";
                      const s = String(raw).slice(0, 10);
                      const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : toISODate(raw);
                      const fechaText = iso ? iso.split("-").reverse().join("/") : "-";
                      const fincaText = crewNameById[String(r.crewId ?? r.crew_id ?? "")] || asFincaName(r.finca ?? r.crewName ?? r.crewId ?? r.crew_id ?? "-");

                      return (
                        <TableRow key={r.id ?? i} className="hover:bg-white/5">
                          <TableCell className="font-medium text-slate-100">
                            {r.nombre ?? r.fullname ?? r.doc ?? "-"}
                          </TableCell>
                          <TableCell className="font-mono text-slate-200">{r.dni ?? r.doc ?? "-"}</TableCell>
                          <TableCell className="truncate text-slate-200">{fincaText}</TableCell>
                          <TableCell className="text-slate-200">{fechaText}</TableCell>
                          <TableCell className="text-right text-slate-200">{getAsistencias(r)}</TableCell>
                          <TableCell className="text-right text-slate-200">{r.filas ?? 0}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </SurfaceCard>

      <p className="mt-6 text-[11px] text-slate-400">
        UI basada en <b>shadcn/ui</b> + <b>lucide-react</b> + <b>Recharts</b>. Dark-mode friendly.
      </p>
    </div>
  );
}
