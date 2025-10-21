import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import Modal from "../components/ui/modal";
import { useToast } from "../components/ui/toast";

const API = import.meta.env.VITE_API || "http://127.0.0.1:4000";

// Las fincas/cuadrillas ahora se cargan desde la base de datos (tabla crews)

function AdminWorkers(){
  const { role } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [crewId, setCrewId] = useState(1);
  const [crews, setCrews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [highlightId, setHighlightId] = useState(null);
  const [sortKey, setSortKey] = useState("fullname"); // 'fullname' | 'doc'
  const [sortDir, setSortDir] = useState("asc"); // 'asc' | 'desc'
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDoc, setNewDoc] = useState("");
  // Validations
  const docRegex = /^[0-9]{5,15}$/;
  const nameRegex = /^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ ]{2,60}$/;
  const newDocValid = docRegex.test(newDoc);
  const newNameValid = newName.trim() ? nameRegex.test(newName) : true;
  // Edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDoc, setEditDoc] = useState("");
  const editDocValid = docRegex.test(editDoc);
  const editNameValid = editName.trim() ? nameRegex.test(editName) : true;
  // Delete confirm modal
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(()=>{
    if (!role || role !== "admin") navigate("/", { replace: true });
  }, [role, navigate]);

  // Cargar crews desde la API
  useEffect(() => {
    let aborted = false;
    async function loadCrews(){
      try {
        const r = await fetch(`${API}/api/crews`, { cache: "no-store" });
        const data = await r.json();
        if (aborted) return;
        const arr = Array.isArray(data) ? data : [];
        setCrews(arr);
        if (arr.length && !crewId) setCrewId(arr[0].id);
      } catch {
        setCrews([]);
      }
    }
    loadCrews();
    return () => { aborted = true; };
  }, []);

  async function load(){
    try{
      setLoading(true);
      const r = await fetch(`${API}/api/workers?crewId=${crewId}`);
      const data = await r.json();
      setWorkers(Array.isArray(data) ? data : []);
    }catch{
      setWorkers([]);
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, [crewId]);

  // Debounce search input (250ms)
  useEffect(()=>{
    const t = setTimeout(()=> setQ(qInput.trim()), 250);
    return ()=> clearTimeout(t);
  }, [qInput]);

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    const base = !s ? workers : workers.filter(w =>
      String(w.fullname || "").toLowerCase().includes(s) ||
      String(w.doc || "").toLowerCase().includes(s)
    );
    const dir = sortDir === "asc" ? 1 : -1;
    const arr = [...base].sort((a,b)=>{
      const av = String((sortKey === "doc" ? a.doc : a.fullname) || "").toLowerCase();
      const bv = String((sortKey === "doc" ? b.doc : b.fullname) || "").toLowerCase();
      return av.localeCompare(bv) * dir;
    });
    return arr;
  }, [q, workers, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageSafe = Math.min(page, totalPages);
  const paged = useMemo(()=>{
    const start = (pageSafe - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, pageSafe, perPage]);

  return (
    <div className="min-h-screen p-6 text-slate-200" style={{ backgroundColor: "rgb(30,34,43)" }}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs text-slate-400">
            <Link to="/">Inicio</Link>
            <span>›</span>
            <span className="text-slate-200/90">Trabajadores</span>
          </div>
          <h1 className="mt-1 text-2xl md:text-3xl font-extrabold tracking-tight text-white">Trabajadores por Finca</h1>
          <p className="text-sm text-slate-400 mt-1">Consulta de trabajadores asignados por finca</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <select
            value={crewId}
            onChange={(e)=> setCrewId(Number(e.target.value))}
            className="h-9 rounded-md border border-white/10 bg-[#2A3040] px-3 text-sm text-slate-200"
          >
            {crews.length ? crews.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            )) : (
              <option value={crewId}>Finca {crewId}</option>
            )}
          </select>
          <div className="flex items-center gap-2">
            <input
              aria-label="Buscar por nombre o DNI"
              value={qInput}
              onChange={(e)=> { setQInput(e.target.value); setPage(1); }}
              placeholder="Buscar por nombre o DNI"
              className="h-9 w-64 rounded-md border border-white/10 bg-[#2A3040] px-3 text-sm text-slate-200 placeholder:text-slate-400"
            />
            {q && (
              <Button variant="secondary" className="border-white/10 bg-[#2A3040] text-slate-200" onClick={()=> { setQ(""); setQInput(""); setPage(1); }}>Limpiar</Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={load} className="bg-indigo-600 hover:bg-indigo-500 text-white">Actualizar</Button>
            <Button onClick={()=> setShowCreate(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white">Nuevo</Button>
          </div>
        </div>
      </div>

      <Card className="border-white/10 bg-[#242A38] shadow-lg shadow-black/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-slate-100">{(crews.find(f=>f.id===crewId)?.name) || `Finca ${crewId}`} — Lista</CardTitle>
          <CardDescription className="text-slate-400">{loading ? "Cargando..." : `${filtered.length} trabajador(es)`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="max-h[520px] min-h-[280px] overflow-y-auto rounded-md border border-white/10">
              <Table className="table-fixed">
                <TableHeader className="sticky top-0 bg-[#2A3040] z-10">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[36%] text-slate-300">
                      <button
                        className="inline-flex items-center gap-1 hover:underline"
                        onClick={()=>{ setSortKey("fullname"); setSortDir(sortKey === "fullname" && sortDir === "asc" ? "desc" : "asc"); setPage(1); }}
                        title="Ordenar por nombre"
                      >
                        Nombre
                        <span className="text-[10px] opacity-70">{sortKey === "fullname" ? (sortDir === "asc" ? "▲" : "▼") : ""}</span>
                      </button>
                    </TableHead>
                    <TableHead className="w-[26%] text-slate-300">
                      <button
                        className="inline-flex items-center gap-1 hover:underline"
                        onClick={()=>{ setSortKey("doc"); setSortDir(sortKey === "doc" && sortDir === "asc" ? "desc" : "asc"); setPage(1); }}
                        title="Ordenar por documento"
                      >
                        Documento
                        <span className="text-[10px] opacity-70">{sortKey === "doc" ? (sortDir === "asc" ? "▲" : "▼") : ""}</span>
                      </button>
                    </TableHead>
                    <TableHead className="w-[18%] text-slate-300 hidden sm:table-cell">Finca</TableHead>
                    <TableHead className="w-[20%] text-right text-slate-300">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: Math.min(5, perPage) }).map((_, idx) => (
                      <TableRow key={`s-${idx}`} className="animate-pulse">
                        <TableCell><div className="h-4 w-40 bg-white/10 rounded" /></TableCell>
                        <TableCell><div className="h-4 w-24 bg-white/10 rounded" /></TableCell>
                        <TableCell className="hidden sm:table-cell"><div className="h-4 w-20 bg-white/10 rounded" /></TableCell>
                        <TableCell className="text-right"><div className="ml-auto h-8 w-24 bg-white/10 rounded" /></TableCell>
                      </TableRow>
                    ))
                  ) : !filtered.length ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-400 py-6">
                        {loading ? "Cargando..." : "Sin trabajadores para esta finca"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paged.map((w, i) => (
                      <TableRow key={w.id ?? `${w.doc}-${i}`} className={`hover:bg-white/5 ${highlightId === w.id ? "bg-emerald-900/30" : ""}`}>
                        <TableCell className="text-slate-100">{w.fullname || "-"}</TableCell>
                        <TableCell className="font-mono text-slate-200">{w.doc || "-"}</TableCell>
                        <TableCell className="text-slate-200 hidden sm:table-cell">{(crews.find(f=>f.id===crewId)?.name) || `Finca ${crewId}`}</TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex gap-2">
                            <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-500 text-white" onClick={()=> { setEditTarget(w); setEditName(w.fullname || ""); setEditDoc(w.doc || ""); setShowEdit(true); }}>Editar</Button>
                            <Button size="sm" variant="destructive" className="h-8" onClick={()=> { setDeleteTarget(w); setShowDelete(true); }}>Eliminar</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Pagination */}
            <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-300">
              <div>
                Mostrando {filtered.length ? ((pageSafe - 1) * perPage + 1) : 0}–{Math.min(pageSafe * perPage, filtered.length)} de {filtered.length}
              </div>
              <div className="flex items-center gap-2">
                <span>Por página</span>
                <select
                  value={perPage}
                  onChange={(e)=> { setPerPage(Number(e.target.value)); setPage(1); }}
                  className="h-8 rounded-md border border-white/10 bg-[#2A3040] px-2 text-xs text-slate-200"
                >
                  {[5,10,20,50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <div className="inline-flex items-center gap-1">
                  <Button variant="secondary" className="h-8 border-white/10 bg-[#2A3040] text-slate-200" onClick={()=> setPage(p => Math.max(1, p-1))} disabled={pageSafe<=1}>&lt;</Button>
                  <span className="mx-1">{pageSafe}/{totalPages}</span>
                  <Button variant="secondary" className="h-8 border-white/10 bg-[#2A3040] text-slate-200" onClick={()=> setPage(p => Math.min(totalPages, p+1))} disabled={pageSafe>=totalPages}>&gt;</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={()=> setShowCreate(false)}
        title="Nuevo trabajador"
        footer={(
          <>
            <Button variant="secondary" className="border-white/10 bg-[#2A3040] text-slate-200" onClick={()=> setShowCreate(false)}>Cancelar</Button>
            <Button disabled={creating || !newDocValid || !newNameValid} className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={async ()=>{
              try{
                setCreating(true);
                const resp = await fetch(`${API}/api/workers`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ crewId, fullname: newName, doc: newDoc }),
                });
                const data = await resp.json().catch(()=> null);
                if (!resp.ok) {
                  showToast({ title: "Error al crear", description: String(data?.error || "Intenta nuevamente"), variant: "destructive" });
                  // Mantener modal abierto si falla
                  return;
                }
                // Si el filtro actual ocultaría al nuevo registro, limpiar filtro para que se vea
                if (data && typeof data === "object") {
                  const s = q.trim().toLowerCase();
                  const matches = !s || String(data.fullname || "").toLowerCase().includes(s) || String(data.doc || "").toLowerCase().includes(s);
                  if (!matches) setQ("");
                  if (data.id) {
                    setHighlightId(data.id);
                    setTimeout(()=> setHighlightId(null), 4000);
                  }
                }
                setNewName(""); setNewDoc("");
                setShowCreate(false);
                await load();
                showToast({ title: "Guardado", description: "Trabajador registrado", variant: "success" });
              } finally { setCreating(false); }
            }}>{creating ? "Creando..." : "Crear"}</Button>
          </>
        )}
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-300">Nombre</label>
            <Input
              value={newName}
              onChange={(e)=> setNewName(e.target.value)}
              placeholder="Nombre completo"
              className={`mt-1 bg-[#2A3040] border-white/10 text-slate-200 ${!newNameValid ? "ring-1 ring-red-500/60" : ""}`}
            />
            {!newNameValid && (
              <div className="mt-1 text-xs text-red-400">Solo letras y espacios (2-60).</div>
            )}
          </div>
          <div>
            <label className="text-sm text-slate-300">Documento</label>
            <Input
              value={newDoc}
              onChange={(e)=> setNewDoc(e.target.value.replace(/\D+/g, ""))}
              placeholder="Solo números (5-15)"
              inputMode="numeric"
              className={`mt-1 bg-[#2A3040] border-white/10 text-slate-200 ${newDoc && !newDocValid ? "ring-1 ring-red-500/60" : ""}`}
            />
            {newDoc && !newDocValid && (
              <div className="mt-1 text-xs text-red-400">Documento inválido. Usa 5 a 15 dígitos.</div>
            )}
          </div>
          <p className="text-xs text-slate-400">El documento debe ser único dentro de la finca.</p>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={showEdit}
        onClose={()=> setShowEdit(false)}
        title={`Editar trabajador${editTarget?.fullname ? ` — ${editTarget.fullname}` : ""}`}
        footer={(
          <>
            <Button variant="secondary" className="border-white/10 bg-[#2A3040] text-slate-200" onClick={()=> setShowEdit(false)}>Cancelar</Button>
            <Button disabled={!editDocValid || !editNameValid} className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={async ()=>{
              if (!editTarget) return;
              await fetch(`${API}/api/workers/${editTarget.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullname: editName, doc: editDoc, crewId }),
              });
              setShowEdit(false);
              await load();
              setHighlightId(editTarget.id);
              setTimeout(()=> setHighlightId(null), 3000);
              showToast({ title: "Cambios guardados", description: "Trabajador actualizado", variant: "success" });
            }}>Guardar</Button>
          </>
        )}
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-300">Nombre</label>
            <Input
              value={editName}
              onChange={(e)=> setEditName(e.target.value)}
              className={`mt-1 bg-[#2A3040] border-white/10 text-slate-200 ${editName && !editNameValid ? "ring-1 ring-red-500/60" : ""}`}
            />
            {editName && !editNameValid && (
              <div className="mt-1 text-xs text-red-400">Solo letras y espacios (2-60).</div>
            )}
          </div>
          <div>
            <label className="text-sm text-slate-300">Documento</label>
            <Input
              value={editDoc}
              onChange={(e)=> setEditDoc(e.target.value.replace(/\D+/g, ""))}
              inputMode="numeric"
              className={`mt-1 bg-[#2A3040] border-white/10 text-slate-200 ${editDoc && !editDocValid ? "ring-1 ring-red-500/60" : ""}`}
            />
            {editDoc && !editDocValid && (
              <div className="mt-1 text-xs text-red-400">Documento inválido. Usa 5 a 15 dígitos.</div>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete confirm Modal */}
      <Modal
        open={showDelete}
        onClose={()=> setShowDelete(false)}
        title="Eliminar trabajador"
        footer={(
          <>
            <Button variant="secondary" className="border-white/10 bg-[#2A3040] text-slate-200" onClick={()=> setShowDelete(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={async ()=>{
              if (!deleteTarget) return;
              await fetch(`${API}/api/workers/${deleteTarget.id}`, { method: "DELETE" });
              setShowDelete(false);
              await load();
              showToast({ title: "Eliminado", description: "Trabajador desactivado", variant: "default" });
            }}>Eliminar</Button>
          </>
        )}
      >
        <p className="text-slate-300">¿Seguro que deseas eliminar a <span className="font-semibold">{deleteTarget?.fullname || deleteTarget?.doc}</span>? Esta acción puede revertirse reactivándolo manualmente en DB.</p>
      </Modal>
    </div>
  );
}

export default AdminWorkers;
