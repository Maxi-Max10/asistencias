import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import Modal from "../components/ui/modal";
import { useToast } from "../components/ui/toast";

const API = import.meta.env.VITE_API || "http://127.0.0.1:4000";

function AdminCrews(){
  const { role } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [crews, setCrews] = useState([]);
  const [q, setQ] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLoc, setNewLoc] = useState(""); // URL de Google Maps o "lat,lng"
  const [creating, setCreating] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState("");
  const [editLoc, setEditLoc] = useState("");

  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(()=>{
    if (!role || role !== "admin") navigate("/", { replace: true });
  }, [role, navigate]);

  async function load(){
    try{
      setLoading(true);
      const r = await fetch(`${API}/api/crews`, { cache: "no-store" });
      const data = await r.json();
      setCrews(Array.isArray(data) ? data : []);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, []);

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    const arr = !s ? crews : crews.filter(c => String(c.name||"").toLowerCase().includes(s) || String(c.id).includes(s));
    return arr.sort((a,b)=> a.id - b.id);
  }, [q, crews]);

  const normalizeMapUrl = (c) => {
    if (!c) return null;
    if (c.map_url) return c.map_url;
    if (c.lat != null && c.lng != null) return `https://www.google.com/maps?q=${c.lat},${c.lng}`;
    return null;
  };

  // ===== Helpers para parsear/embeber =====
  const extractLatLng = (input) => {
    if (!input) return null;
    const s = String(input).trim();
    const at = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (at) return { lat: parseFloat(at[1]), lng: parseFloat(at[2]) };
    const q = s.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (q) return { lat: parseFloat(q[1]), lng: parseFloat(q[2]) };
    const plain = s.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
    if (plain) return { lat: parseFloat(plain[1]), lng: parseFloat(plain[2]) };
    return null;
  };

  const asEmbedSrc = (input) => {
    const ex = extractLatLng(input);
    if (!ex) return null;
    const { lat, lng } = ex;
    return `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
  };

  return (
    <div className="min-h-screen p-6 text-slate-200" style={{ backgroundColor: "rgb(30,34,43)" }}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs text-slate-400">
            <Link to="/">Inicio</Link>
            <span>›</span>
            <span className="text-slate-200/90">Fincas</span>
          </div>
          <h1 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight text-white">Administrar fincas</h1>
          <p className="text-sm text-slate-400 mt-1">Crear, renombrar y eliminar fincas</p>
        </div>
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e)=> setQ(e.target.value)} placeholder="Buscar por nombre o ID" className="h-9 w-64 bg-[#2A3040] border-white/10 text-slate-200 placeholder:text-slate-400"/>
          <Button onClick={load} className="bg-indigo-600 hover:bg-indigo-500 text-white">Actualizar</Button>
          <Button onClick={()=> setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white">Nueva finca</Button>
        </div>
      </div>

      <Card className="border-white/10 bg-[#242A38] shadow-lg shadow-black/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-slate-100">Fincas</CardTitle>
          <CardDescription className="text-slate-400">{loading ? "Cargando..." : `${filtered.length} finca(s)`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-h-[220px] rounded-md border border-white/10">
              <Table className="table-fixed">
                <TableHeader className="sticky top-0 bg-[#2A3040] z-10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[12%] text-slate-300">ID</TableHead>
                    <TableHead className="w-[48%] text-slate-300">Nombre</TableHead>
                    <TableHead className="w-[20%] text-slate-300">Ubicación</TableHead>
                    <TableHead className="w-[20%] text-right text-slate-300">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} className="py-6 text-center text-slate-400">Cargando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="py-6 text-center text-slate-400">Sin fincas</TableCell></TableRow>
                  ) : (
                    filtered.map((c) => (
                      <TableRow key={c.id} className="hover:bg-white/5">
                        <TableCell className="font-mono text-slate-300">{c.id}</TableCell>
                        <TableCell className="text-slate-100">{c.name}</TableCell>
                        <TableCell className="text-slate-200">
                          {normalizeMapUrl(c) ? (
                            <a href={normalizeMapUrl(c)} target="_blank" rel="noreferrer" className="underline text-slate-200">Ver en Maps</a>
                          ) : (
                            <span className="opacity-70">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-2">
                            <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white" onClick={()=> { setEditTarget(c); setEditName(c.name); setEditLoc(c.map_url || (c.lat!=null && c.lng!=null ? `${c.lat},${c.lng}` : "")); setShowEdit(true); }}>Editar</Button>
                            <Button size="sm" variant="destructive" className="h-8" onClick={()=> { setDeleteTarget(c); setShowDelete(true); }}>Eliminar</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Crear */}
      <Modal open={showCreate} onClose={()=> setShowCreate(false)} title="Nueva finca"
        footer={(
          <>
            <Button variant="secondary" className="border-white/10 bg-[#2A3040] text-slate-200" onClick={()=> setShowCreate(false)}>Cancelar</Button>
            <Button disabled={creating || newName.trim().length < 2} className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={async ()=>{
              try{
                setCreating(true);
                const body = { name: newName.trim() };
                const loc = newLoc.trim();
                if (loc) {
                  body.mapUrl = loc;
                  const ex = extractLatLng(loc);
                  if (ex) { body.lat = ex.lat; body.lng = ex.lng; }
                }
                const r = await fetch(`${API}/api/crews`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                const data = await r.json().catch(()=> null);
                if (!r.ok) return showToast({ title: 'No se pudo crear', description: data?.error || 'Intenta nuevamente', variant: 'destructive' });
                setNewName(""); setNewLoc(""); setShowCreate(false); await load();
                showToast({ title: 'Finca creada', variant: 'success' });
              } finally { setCreating(false); }
            }}>{creating ? 'Creando...' : 'Crear'}</Button>
          </>
        )}
      >
        <div className="space-y-3">
          <label className="text-sm text-slate-300">Nombre</label>
          <Input value={newName} onChange={(e)=> setNewName(e.target.value)} placeholder="Ej. Finca Norte" className="bg-[#2A3040] border-white/10 text-slate-200"/>
          <label className="text-sm text-slate-300">Ubicación (URL de Google Maps o "lat,lng")</label>
          <Input value={newLoc} onChange={(e)=> setNewLoc(e.target.value)} placeholder="Pega el enlace de Google Maps (con @lat,lng o q=lat,lng) o lat,lng" className="bg-[#2A3040] border-white/10 text-slate-200"/>
          {newLoc.trim() && (
            (()=>{
              const src = asEmbedSrc(newLoc.trim());
              return src ? (
                <div className="mt-2 rounded-md overflow-hidden border border-white/10">
                  <iframe title="preview-map" src={src} width="100%" height="180" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                </div>
              ) : (
                <p className="mt-2 text-xs text-amber-300">Este enlace no se puede previsualizar. Usá lat,lng o una URL con coordenadas (contenga "@lat,lng" o "q=lat,lng").</p>
              );
            })()
          )}
          <p className="text-xs text-slate-400">Debe ser único y tener 2–80 caracteres.</p>
        </div>
      </Modal>

      {/* Editar */}
      <Modal open={showEdit} onClose={()=> setShowEdit(false)} title={`Editar finca${editTarget ? ` — ${editTarget.name}` : ''}`}
        footer={(
          <>
            <Button variant="secondary" className="border-white/10 bg-[#2A3040] text-slate-200" onClick={()=> setShowEdit(false)}>Cancelar</Button>
            <Button disabled={!editName.trim() || editName.trim().length < 2} className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={async ()=>{
              if (!editTarget) return;
              const body = { name: editName.trim() };
              const loc = editLoc.trim();
              if (loc) {
                body.mapUrl = loc;
                const ex = extractLatLng(loc);
                if (ex) { body.lat = ex.lat; body.lng = ex.lng; }
              }
              const r = await fetch(`${API}/api/crews/${editTarget.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
              const data = await r.json().catch(()=> null);
              if (!r.ok) return showToast({ title: 'No se pudo guardar', description: data?.error || 'Intenta nuevamente', variant: 'destructive' });
              setShowEdit(false); await load(); showToast({ title: 'Cambios guardados', variant: 'success' });
            }}>Guardar</Button>
          </>
        )}
      >
        <div className="space-y-3">
          <label className="text-sm text-slate-300">Nombre</label>
          <Input value={editName} onChange={(e)=> setEditName(e.target.value)} className="bg-[#2A3040] border-white/10 text-slate-200"/>
          <label className="text-sm text-slate-300">Ubicación (URL de Google Maps o "lat,lng")</label>
          <Input value={editLoc} onChange={(e)=> setEditLoc(e.target.value)} className="bg-[#2A3040] border-white/10 text-slate-200"/>
          {editLoc.trim() && (
            (()=>{
              const src = asEmbedSrc(editLoc.trim());
              return src ? (
                <div className="mt-2 rounded-md overflow-hidden border border-white/10">
                  <iframe title="preview-map-edit" src={src} width="100%" height="180" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                </div>
              ) : (
                <p className="mt-2 text-xs text-amber-300">Este enlace no se puede previsualizar. Usá lat,lng o una URL con coordenadas (contenga "@lat,lng" o "q=lat,lng").</p>
              );
            })()
          )}
        </div>
      </Modal>

      {/* Eliminar */}
      <Modal open={showDelete} onClose={()=> setShowDelete(false)} title="Eliminar finca"
        footer={(
          <>
            <Button variant="secondary" className="border-white/10 bg-[#2A3040] text-slate-200" onClick={()=> setShowDelete(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={async ()=>{
              if (!deleteTarget) return;
              const r = await fetch(`${API}/api/crews/${deleteTarget.id}`, { method: 'DELETE' });
              const data = await r.json().catch(()=> null);
              if (!r.ok) return showToast({ title: 'No se pudo eliminar', description: data?.error || 'Intenta nuevamente', variant: 'destructive' });
              setShowDelete(false); await load(); showToast({ title: 'Finca eliminada', variant: 'default' });
            }}>Eliminar</Button>
          </>
        )}
      >
        <p className="text-slate-300">Se eliminarán también los trabajadores y asistencias asociadas a <span className="font-semibold">{deleteTarget?.name}</span>.</p>
      </Modal>
    </div>
  );
}

export default AdminCrews;
