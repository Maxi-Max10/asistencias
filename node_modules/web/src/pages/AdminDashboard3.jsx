
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

// ========================== Helpers ==========================
function toISODate(d) {
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "";
  }
}

// Incluye crewId/crew_id para mostrar la finca/cuadrilla
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
  const match = s.match(/\d+/);
  return match ? match[0] : s;
}

// Normaliza asistencias (acepta varias claves)
function getAsistencias(r) {
  if (!r) return 0;
  const v =
    r.asistencias ??
    r.asistencia ??
    r.attendances ??
    (typeof r.present === "boolean" ? (r.present ? 1 : 0) : undefined);
  return Number(v ?? 0);
}

// ========================== CSV export ==========================
function downloadCSV(rows = [], filename = "report.csv") {
  if (!rows || !rows.length) return;
  const keys = Object.keys(rows[0]);
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

// ============================ UI bits ============================
function DeltaBadge({ value }) {
  const n = Number(value ?? 0);
  const pos = n >= 0;
  return (
    <Badge
      variant={pos ? "default" : "destructive"}
      className={pos ? "bg-emerald-600/90 hover:bg-emerald-600" : ""}
    >
      {pos ? "▲" : "▼"} {pos ? `+${n}%` : `${n}%`}
    </Badge>
  );
}

function Kpi({ title, value, delta, icon, gradient = "from-indigo-500 to-indigo-400" }) {
  return (
    <Card className="border-white/10 bg-gradient-to-br from-white/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2.5 text-white shadow bg-gradient-to-br ${gradient}`}>
            {icon}
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-2xl font-extrabold tracking-tight">{value}</p>
              <DeltaBadge value={delta} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================== Vista ==============================
export default function AdminDashboard() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [range, setRange] = useState("week"); // "week" | "month"
  const [query, setQuery] = useState("");
  const [day, setDay] = useState(toISODate(new Date()));

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

  // Filtra por día (acepta r.date ISO o r.fecha)
  const filteredRecent = recent
    .filter((r) => {
      if (!day) return true;
      const raw = r?.date ?? r?.fecha ?? "";
      if (!raw) return false;
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(raw)) ? String(raw) : toISODate(raw);
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

  // Datos charts
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
      <div className="min-h-screen p-6" style={{ backgroundColor: "rgb(30,34,43)" }}>
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
    <div className="min-h-screen p-6" style={{ backgroundColor: "rgb(30,34,43)" }}>
      {/* Topbar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span>Inicio</span>
            <span>›</span>
            <span className="text-foreground/80">Panel</span>
          </div>
          <h1 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight">Dashboard — Administrador</h1>
          <p className="text-sm text-muted-foreground mt-1">Métricas, fincas top y registros recientes</p>
        </div>
        <div className="flex items-center gap-3">
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v)}
            className="rounded-xl border border-white/10 bg-white/5 p-1"
          >
            <ToggleGroupItem value="week" className="data-[state=on]:bg-indigo-600 data-[state=on]:text-white">
              Semana
            </ToggleGroupItem>
            <ToggleGroupItem value="month" className="data-[state=on]:bg-indigo-600 data-[state=on]:text-white">
              Mes
            </ToggleGroupItem>
          </ToggleGroup>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm"
            title="Filtrar por día"
          />
          <Button
            variant="secondary"
            className="border-white/10 bg-white/5"
            onClick={() => downloadCSV(filteredRecent, `recent-${day}.csv`)}
          >
            <Download className="mr-2 h-4 w-4" /> CSV
          </Button>
          <Button variant="destructive" onClick={() => logout && logout()}>
            <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <Kpi
          title="Total Asistencias (Cuadrilleros)"
          value={stats?.totalAsistencias ?? 0}
          delta={stats?.deltas?.asistencias ?? 4}
          gradient="from-indigo-500 to-indigo-400"
          icon={<Check size={18} />}
        />
        <Kpi
          title="Cuadrilleros"
          value={stats?.cuadrillerosUnicos ?? 0}
          delta={stats?.deltas?.cuadrilleros ?? 1}
          gradient="from-emerald-400 to-emerald-500"
          icon={<Users size={18} />}
        />
        <Kpi
          title="Filas hechas"
          value={stats?.filasHechas ?? 0}
          delta={stats?.deltas?.filas ?? 6}
          gradient="from-amber-400 to-orange-500"
          icon={<BarChart2 size={18} />}
        />
        <Kpi
          title="Prom. filas/cuadrillero"
          value={stats?.promFilasCuadrillero ? Number(stats.promFilasCuadrillero).toFixed(1) : "0.0"}
          delta={stats?.deltas?.prom ?? 0}
          gradient="from-fuchsia-500 to-pink-500"
          icon={<BarChart2 size={18} />}
        />
      </div>

      {/* Charts - full width */}
      <div className="mb-6">
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle>Estado de la cosecha</CardTitle>
            <CardDescription>
              Últimos datos — actualizado {new Date().toLocaleDateString("es-AR")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 420 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                  <XAxis dataKey="dia" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => (typeof v === "number" ? v.toLocaleString("es-AR") : v)} />
                  <Legend />
                  <ReferenceLine y={55} yAxisId="left" stroke="#FB923C" strokeDasharray="6 6" label="Meta" />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="filas"
                    name="Filas hechas"
                    stroke="#6366F1"
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="asistencias"
                    name="Asistencias"
                    stroke="#34D399"
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top fincas abajo - full width */}
      <div className="mb-6">
        <Card className="w-full">
          <CardHeader className="pb-2">
            <CardTitle>Top fincas</CardTitle>
            <CardDescription>Por filas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
                  <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => (typeof v === "number" ? v.toLocaleString("es-AR") : v)} />
                  <Bar dataKey="filas" name="Filas por finca" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Separator className="my-4" />
            <div className="divide-y divide-white/10">
              {topFincas.length ? (
                topFincas.map((f, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-600 to-pink-500 text-white flex items-center justify-center text-sm font-semibold">
                        {String(f.name || "").slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium leading-tight">{f.name}</div>
                        <div className="text-xs text-muted-foreground">{f.location ?? ""}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{f.filas}</div>
                      <div className="text-xs text-muted-foreground">{f.asistencias ?? 0} as.</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No hay datos de fincas.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registros recientes (por día) */}
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle>Registros recientes</CardTitle>
          <CardDescription>Últimas cargas y asistencias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nombre, DNI o finca..."
              className="w-64"
            />
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm"
              title="Filtrar por día"
            />
            <Button variant="outline" onClick={() => downloadCSV(filteredRecent, `recent-${day}.csv`)}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
          </div>
          <div className="overflow-x-auto">
            <div className="max-h-[480px] min-h-[320px] overflow-y-scroll rounded-md">
              <Table className="table-fixed">
                <TableHeader className="sticky top-0 bg-background/80 backdrop-blur z-10">
                  <TableRow>
                    <TableHead className="w-[22%]">Nombre</TableHead>
                    <TableHead className="w-[14%]">DNI</TableHead>
                    <TableHead className="w-[18%]">Cuadrilla</TableHead>
                    <TableHead className="w-[14%]">Finca</TableHead>
                    <TableHead className="w-[18%]">Fecha</TableHead>
                    <TableHead className="w-[7%] text-right">Asist.</TableHead>
                    <TableHead className="w-[7%] text-right">Filas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        No hay registros
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecent.map((r, i) => {
                      const iso = r?.date ?? (r?.fecha ? toISODate(r.fecha) : "");
                      const fechaText = iso ? iso.split("-").reverse().join("/") : "-";
                      return (
                        <TableRow key={r.id ?? i} className="hover:bg-white/5">
                          <TableCell className="font-medium">
                            {r.nombre ?? r.fullname ?? r.doc ?? "-"}
                          </TableCell>
                          <TableCell className="font-mono">{r.dni ?? r.doc ?? "-"}</TableCell>
                          <TableCell className="truncate">{r.cuadrilla ?? r.crewName ?? "-"}</TableCell>
                          <TableCell className="text-center">
                            {getFincaLabel(r) === "-" ? "-" : `Finca ${getFincaLabel(r)}`}
                          </TableCell>
                          <TableCell>{fechaText}</TableCell>
                          <TableCell className="text-right">{getAsistencias(r)}</TableCell>
                          <TableCell className="text-right">{r.filas ?? 0}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-[11px] text-muted-foreground">
        UI basada en <b>shadcn/ui</b> + <b>lucide-react</b> + <b>Recharts</b>. Dark-mode friendly.
      </p>
    </div>
  );
}
