
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
import { Download, LogOut, Users, Check, BarChart2 } from "lucide-react";

const API = import.meta.env.VITE_API || "http://127.0.0.1:4000";

/* ========================== Helpers ========================== */
function todayLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`; // siempre día local
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

function getFincaLabel(r) {
  const v =
    r?.fincaId ??
    r?.finca ??
    r?.locationId ??
    r?.location ??
    r?.crewId ??
    r?.crew_id ??
    "-";
  if (v === "-" || v == null) return "-";
  const s = String(v);
  const match = s.match(/\\d+/);
  return match ? match[0] : s;
}

function getAsistencias(r) {
  if (!r) return 0;
  if (r.asistencias != null && !isNaN(Number(r.asistencias))) return Number(r.asistencias);
  if (r.asistencia  != null && !isNaN(Number(r.asistencia)))  return Number(r.asistencia);
  if (r.attendances != null && !isNaN(Number(r.attendances))) return Number(r.attendances);
  const s = String(r.asistencia ?? r.status ?? "").toLowerCase().trim();
  if (s === "present" || s === "presente" || s === "si" || s === "sí") return 1;
  if (s === "absent" || s === "ausente" || s === "no") return 0;
  if (typeof r.present === "boolean") return r.present ? 1 : 0;
  if (!isNaN(Number(r.filas)) && Number(r.filas) > 0) return 1;
  return 0;
}

function downloadCSV(rows = [], filename = "report.csv") {
  if (!rows || !rows.length) return;
  const keys = Object.keys(rows[0] || {});
  if (!keys.length) return;
  const csv = [
    keys.join(","),
    ...rows.map((r) =>
      keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\\n");
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
  const [day, setDay] = useState(todayLocal()); // ✅

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

  const filteredRecent = recent
    .filter((r) => {
      if (!day) return true;
      const raw = r?.date ?? r?.fecha ?? "";
      if (!raw) return false;
      const s = String(raw).slice(0, 10);
      const iso = /^\\d{4}-\\d{2}-\\d{2}$/.test(s) ? s : toISODate(raw);
      return iso === day;
    })
    .filter((r) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        String(r.nombre || r.fullname || r.doc || "").toLowerCase().includes(q) ||
        String(r.dni || r.doc || "").toLowerCase().includes(q) ||
        String(getFincaLabel(r)).toLowerCase().includes(q)
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
      (topFincas.length
        ? topFincas
        : [
            { name: "Los Álamos", filas: 120, asistencias: 20 },
            { name: "El Sol", filas: 98, asistencias: 18 },
            { name: "Las Nubes", filas: 76, asistencias: 12 },
          ]
      ).map((f) => ({ name: f.name, filas: Number(f.filas ?? 0), asistencias: Number(f.asistencias ?? 0) })),
    [topFincas]
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
          <Button variant="destructive" className="bg-rose-600 hover:bg-rose-500 text-white" onClick={() => logout && logout()}>
            <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Kpi title="Total Asistencias (Cuadrilleros)" value={stats?.totalAsistencias ?? 0} delta={stats?.deltas?.asistencias ?? 4} gradient="from-indigo-500 to-indigo-400" icon={<Check size={18} />} />
        <Kpi title="Cuadrilleros" value={stats?.cuadrillerosUnicos ?? 0} delta={stats?.deltas?.cuadrilleros ?? 1} gradient="from-emerald-400 to-emerald-500" icon={<Users size={18} />} />
        <Kpi title="Filas hechas" value={stats?.filasHechas ?? 0} delta={stats?.deltas?.filas ?? 6} gradient="from-amber-400 to-orange-500" icon={<BarChart2 size={18} />} />
        <Kpi title="Prom. filas/cuadrillero" value={stats?.promFilasCuadrillero ? Number(stats.promFilasCuadrillero).toFixed(1) : "0.0"} delta={stats?.deltas?.prom ?? 0} gradient="from-fuchsia-500 to-pink-500" icon={<BarChart2 size={18} />} />
      </div>

      {/* Charts - full width */}
      <div className="mb-6">
        <SurfaceCard className="w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-100">Estado de la cosecha</CardTitle>
            <CardDescription className="text-slate-400">
              Últimos datos — actualizado {new Date().toLocaleDateString("es-AR")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 420 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="dia" stroke="#A3B1C6" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#A3B1C6" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#A3B1C6" tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#242A38", border: "1px solid rgba(255,255,255,0.08)", color: "#E5E7EB" }} />
                  <Legend wrapperStyle={{ color: "#E5E7EB" }} />
                  <ReferenceLine y={55} yAxisId="left" stroke="#FB923C" strokeDasharray="6 6" label={{ value: "Meta", fill: "#FB923C" }} />
                  <Line yAxisId="left" type="monotone" dataKey="filas" name="Filas hechas" stroke="#7287FD" strokeWidth={2} dot={{ r: 2.5, stroke: "#7287FD" }} activeDot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="asistencias" name="Asistencias" stroke="#34D399" strokeWidth={2} dot={{ r: 2.5, stroke: "#34D399" }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </SurfaceCard>
      </div>

      {/* Top fincas abajo - full width */}
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
              {topFincas.length ? (
                topFincas.map((f, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-pink-500 text-white flex items-center justify-center text-sm font-semibold">
                        {String(f.name || "").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium leading-tight text-slate-100">{f.name}</div>
                        <div className="text-xs text-slate-400">{f.location ?? ""}</div>
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

      {/* Registros recientes (por día) */}
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
                    <TableHead className="w-[18%] text-slate-300">Cuadrilla</TableHead>
                    <TableHead className="w-[14%] text-slate-300">Finca</TableHead>
                    <TableHead className="w-[18%] text-slate-300">Fecha</TableHead>
                    <TableHead className="w-[7%] text-right text-slate-300">Asist.</TableHead>
                    <TableHead className="w-[7%] text-right text-slate-300">Filas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-slate-400 py-6">
                        No hay registros
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecent.map((r, i) => {
                     // dentro del map de filas:
                      const raw = r?.date ?? r?.fecha ?? "";
                      const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(raw).slice(0,10)) ? String(raw).slice(0,10) : toISODate(raw);
                      const fechaText = iso ? iso.split("-").reverse().join("/") : "-";

                      return (
                        <TableRow key={r.id ?? i} className="hover:bg-white/5">
                          <TableCell className="font-medium text-slate-100">
                            {r.nombre ?? r.fullname ?? r.doc ?? "-"}
                          </TableCell>
                          <TableCell className="font-mono text-slate-200">{r.dni ?? r.doc ?? "-"}</TableCell>
                          <TableCell className="truncate text-slate-200">{r.cuadrilla ?? r.crewName ?? "-"}</TableCell>
                          <TableCell className="text-center text-slate-200">
                            {getFincaLabel(r) === "-" ? "-" : `Finca ${getFincaLabel(r)}`}
                          </TableCell>
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
