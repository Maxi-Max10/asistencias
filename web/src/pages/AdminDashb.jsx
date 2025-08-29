
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
      <h1 className="text-white text-2xl mb-4">Dashboard — Administrador</h1>
      {/* resto de la UI */}
    </div>
  );
}
