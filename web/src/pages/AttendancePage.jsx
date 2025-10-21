import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
const API = import.meta.env.VITE_API || "http://127.0.0.1:4000";

/* ======== Speech ======== */
function useSpeech(onText){
  const recRef = useRef(null);
  const [active, setActive] = useState(false);
  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Tu navegador no soporta reconocimiento de voz"); return; }
    const rec = new SR();
    rec.lang = "es-AR";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e)=>{
      const txt = Array.from(e.results).map(r=>r[0].transcript).join(" ");
      onText(txt);
    };
    rec.onend = ()=> setActive(false);
    recRef.current = rec; rec.start(); setActive(true);
  };
  const stop = ()=> { recRef.current?.stop(); setActive(false); };
  return { start, stop, active };
}

/* ======== Helpers ======== */
const norm = (s="") => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();

function statusFromTokens(tokens, i){
  const t = norm(tokens[i] || "");
  if (t === "presente") return { status: "present", inc: 1 };
  if (t === "ausente" || t === "falta" || t === "falto" || t === "faltó")
    return { status: "absent", inc: 1 };
  return null;
}

function extractPairsLatam(phrase){
  const KW = new Set(["dni","documento","documento:","cedula","cédula","ci","identidad","run","rut","cpf","curp","rfc","rg"]);
  const SKIP = new Set([
    "y","con","coma","punto","de","del","el","la",
    "cero","uno","una","dos","tres","cuatro","cinco","seis","siete","ocho","nueve",
    "diez","once","doce","trece","catorce","quince","veinte","treinta","cuarenta",
    "cincuenta","sesenta","setenta","ochenta","noventa",
    "cien","ciento","doscientos","trescientos","cuatrocientos","quinientos",
    "seiscientos","setecientos","ochocientos","novecientos",
    "mil","millon","millón","millones","billon","billón","billones","bien","esta","está","cargando"
  ]);

  const tokens = phrase.split(/\s+/).filter(Boolean);
  const cleanChunk = (tk) => tk.replace(/[^0-9a-z]/gi,"");
  const isDigits = (s) => /^[0-9]+$/.test(s);

  let mode = "numeric";
  const setModeByKw = (kw) => {
    if (kw === "rut" || kw === "run") mode = "rut";
    else if (kw === "curp" || kw === "rfc") mode = "alnum";
    else mode = "numeric";
  };

  const pushDoc = (buf, status, out) => {
    if (!buf) return;
    let id = buf.toUpperCase();
    if (isDigits(id)) {
      id = id.replace(/^0+/, "");
      if (id.length < 5) return;
      if (id.length > 12) id = id.slice(-12);
    } else {
      if (id.length < 6) return;
      if (id.length > 18) id = id.slice(0, 18);
    }
    out.push({ doc: id, status });
  };

  let buf = "", pairs = [];
  for (let i=0;i<tokens.length;i++){
    const raw = tokens[i];
    const t = norm(raw);

    if (KW.has(t)) { buf=""; setModeByKw(t); continue; }

    const st = statusFromTokens(tokens, i);
    if (st) { if (buf) pushDoc(buf, st.status, pairs); buf=""; continue; }

    if (SKIP.has(t)) continue;

    const chunk = cleanChunk(raw);
    if (!chunk) continue;

    if (mode === "numeric") {
      const d = chunk.replace(/\D/g,"");
      if (d) buf += d;
    } else if (mode === "rut") {
      if (/^[0-9]+$/.test(chunk)) buf += chunk;
      else if (chunk.length === 1 && /k/i.test(chunk) && /^[0-9]+$/.test(buf) && buf.length >= 6) buf += "K";
    } else {
      buf += chunk.toUpperCase();
    }

    if (buf.length > 24) buf = buf.slice(-18);
  }

  const map = new Map();
  for (const p of pairs) map.set(p.doc, p.status);
  return Array.from(map, ([doc,status]) => ({ doc, status }));
}

// Nota: Eliminamos datos de ejemplo. Toda la vista usa datos de la base vía API.

export default function AttendancePage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const crewId = useMemo(() => Number(params.id || 1), [params.id]);

  useEffect(() => {
    if (!role) navigate("/", { replace: true });
    else if (role !== "cuadrillero") navigate("/", { replace: true });
  }, [role, navigate]);

  const [doc, setDoc] = useState("");
  const [status, setStatus] = useState("present");
  const [lastHeard, setLastHeard] = useState("");
  const [rows, setRows] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [markingAbsent, setMarkingAbsent] = useState({});
  const { start, stop, active } = useSpeech(setLastHeard);

  // Traer crews para mostrar el nombre real de la finca
  const [crews, setCrews] = useState([]);
  useEffect(() => {
    let aborted = false;
    async function loadCrews() {
      try {
        const r = await fetch(`${API}/api/crews`, { cache: "no-store" });
        const data = await r.json();
        if (!aborted) setCrews(Array.isArray(data) ? data : []);
      } catch {
        if (!aborted) setCrews([]);
      }
    }
    loadCrews();
    return () => { aborted = true; };
  }, []);

  const crewObj = useMemo(() => crews.find(c => Number(c.id) === Number(crewId)) || null, [crews, crewId]);
  const crewName = useMemo(() => crewObj?.name || `Finca ${crewId}` , [crewObj, crewId]);
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
  const crewMap = useMemo(() => {
    if (!crewObj) return { clickUrl: null, embedUrl: null, fallbackEmbedUrl: null, fallbackClick: null };
    const clickUrl = crewObj.map_url
      ? crewObj.map_url
      : (crewObj.lat != null && crewObj.lng != null ? `https://www.google.com/maps?q=${crewObj.lat},${crewObj.lng}` : null);
    let embedUrl = null;
    if (crewObj.lat != null && crewObj.lng != null) {
      embedUrl = `https://www.google.com/maps?q=${crewObj.lat},${crewObj.lng}&z=15&output=embed`;
    } else if (crewObj.map_url) {
      const ex = extractLatLng(crewObj.map_url);
      if (ex) embedUrl = `https://www.google.com/maps?q=${ex.lat},${ex.lng}&z=15&output=embed`;
    }
    const fallbackQuery = crewObj?.name ? `${crewObj.name} Argentina` : null;
    const fallbackEmbedUrl = fallbackQuery ? `https://www.google.com/maps?q=${encodeURIComponent(fallbackQuery)}&z=13&output=embed` : null;
    const fallbackClick = fallbackQuery ? `https://www.google.com/maps?q=${encodeURIComponent(fallbackQuery)}` : null;
    return { clickUrl, embedUrl, fallbackEmbedUrl, fallbackClick };
  }, [crewObj]);

  const queueRef = useRef(new Map());
  const timerRef = useRef(null);
  const sendingRef = useRef(false);

  useEffect(()=>{
    queueRef.current.clear();
    if (timerRef.current) clearTimeout(timerRef.current);
    setLastHeard("");
    setDoc("");
    setStatus("present");
    fetchToday();
  }, [crewId]);

  useEffect(()=>{
    let aborted = false;
    async function run(){
      try{
        setWorkersLoading(true);
        const r = await fetch(`${API}/api/workers?crewId=${crewId}`, { cache: "no-store" });
        const data = await r.json();
        if (aborted) return;
        const arr = Array.isArray(data) ? data : [];
        setWorkers(arr);
      }catch{
        setWorkers([]);
      }finally{
        if (!aborted) setWorkersLoading(false);
      }
    }
    run();
    return ()=>{ aborted = true; };
  }, [crewId]);

  async function fetchToday(){
    try{
      setListLoading(true);
      const r = await fetch(`${API}/api/attendance/today?crewId=${crewId}&_=${Date.now()}`, { cache: "no-store" });
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
    }catch{}
    finally { setListLoading(false); }
  }

  async function flushQueue(){
    if (sendingRef.current) return;
    const items = Array.from(queueRef.current, ([d, s]) => ({ doc: d, status: s }));
    if (!items.length) return;
    sendingRef.current = true;
    try{
      await fetch(`${API}/api/attendance/bulk`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ crewId, items })
      });
      queueRef.current.clear();
      setDoc("");
      await fetchToday();
    }catch(e){ console.error(e); }
    finally{ sendingRef.current = false; }
  }

  function enqueueItems(items){
    for (const it of items) queueRef.current.set(it.doc, it.status);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushQueue, 250);
  }

  useEffect(()=>{
    if (!lastHeard) return;
    const phrase = lastHeard.toLowerCase();

    const items = extractPairsLatam(phrase);
    if (items.length){
      enqueueItems(items);
      const last = items[items.length - 1];
      setDoc(last.doc); setStatus(last.status);
      return;
    }

    const statusMatch = phrase.match(/\b(presente|ausente|falta|faltó|falto)\b/i);
    let st = null;
    let search = phrase;
    if (statusMatch) {
      st = /presente/i.test(statusMatch[1]) ? "present" : "absent";
      search = phrase.slice(0, statusMatch.index);
    }
    const digits = (search.match(/[0-9]/g) || []).join("");
    let singleDoc = "";
    if (digits) {
      singleDoc = digits.replace(/^0+/, "");
      if (singleDoc.length > 12) singleDoc = singleDoc.slice(-12);
      if (singleDoc.length < 5) singleDoc = "";
    }
    if (singleDoc) setDoc(singleDoc);
    if (st) setStatus(st);
    if (singleDoc && st) enqueueItems([{ doc: singleDoc, status: st }]);
  }, [lastHeard]);

  async function postSingle(){
    const d = doc.trim();
    if (!d) return;
    try{
      await fetch(`${API}/api/attendance`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ crewId, doc: d, status })
      });
      setDoc("");
      await fetchToday();
    }catch(e){ console.error(e); }
  }

  async function markAbsent(docStr){
    const d = String(docStr || "").trim();
    if (!d) return;
    try{
      setMarkingAbsent(prev => ({ ...prev, [d]: true }));
      await fetch(`${API}/api/attendance`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ crewId, doc: d, status: "absent" })
      });
      await fetchToday();
    }catch(e){ console.error(e); }
    finally{
      setMarkingAbsent(prev => { const n={...prev}; delete n[d]; return n; });
    }
  }

  const combinedList = useMemo(()=>{
    const map = new Map();
    for (const r of rows) {
      const key = String(r.doc);
      map.set(key, { doc: key, fullname: r.fullname, status: r.status, source: "row", rowId: r.id });
    }
    const seen = new Set();
    const fromWorkers = workers.map(w => {
      const key = String(w.doc);
      seen.add(key);
      const r = map.get(key);
      const hasRecord = !!r;
      return {
        doc: key,
        fullname: w.fullname || r?.fullname,
        status: hasRecord ? r.status : "present",
        source: "worker",
        rowId: r?.id,
        hasRecord
      };
    });
    const extras = rows
      .filter(r => !seen.has(String(r.doc)))
      .map(r => ({ doc: String(r.doc), fullname: r.fullname, status: r.status, source: "extra", rowId: r.id, hasRecord: true }));
    return [...fromWorkers, ...extras];
  }, [rows, workers]);

  useEffect(()=>{ fetchToday(); }, []);

  return (
    <div className="min-h-screen bg-white antialiased">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-3 items-center mb-6 sm:mb-8">
          <div className="justify-self-start">
            <Link to="/" aria-label="Volver" className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-gray-300 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-black/10 text-sm sm:text-base font-medium">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5A1 1 0 1112.707 5.707L9.414 9l3.293 3.293a1 1 0 010 1.414z" clipRule="evenodd"/></svg>
              <span className="hidden sm:inline">Volver</span>
            </Link>
          </div>
          <div className="justify-self-center">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <span>Asistencia —</span>
              <span className="inline-flex items-center gap-2">{crewName}</span>
            </h1>
          </div>
        </div>

        {(crewMap.embedUrl || crewMap.fallbackEmbedUrl || crewMap.clickUrl || crewMap.fallbackClick) && (
          <div className="mb-6">
            {(crewMap.embedUrl || crewMap.fallbackEmbedUrl) && (
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <iframe
                  title="map"
                  src={crewMap.embedUrl || crewMap.fallbackEmbedUrl}
                  width="100%"
                  height="240"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
            <div className="mt-2">
              <a href={crewMap.clickUrl || crewMap.fallbackClick || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
                Abrir en Google Maps
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.293 2.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414L8.414 17H5a1 1 0 01-1-1v-3.414L12.293 2.293zM11 4.414L4 11.414V16h4.586L15 9.586 11 5.586V4.414z" clipRule="evenodd"/></svg>
              </a>
            </div>
          </div>
        )}

        <div className="bg-black text-white rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <button onClick={active ? stop : start} className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium w-full sm:w-auto transition text-sm sm:text-base ${active ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-800 hover:bg-gray-700'}`}>
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                {active ? (<path fillRule="evenodd" d="M6 5a1 1 0 011-1h6a1 1 0 011 1v10a1 1 0 01-1 1H7a1 1 0 01-1-1V5z" clipRule="evenodd" />) : (<path d="M10 2a2 2 0 00-2 2v6a2 2 0 104 0V4a2 2 0 00-2-2z" />)}
              </svg>
              {active ? 'Detener' : 'Grabar por voz'}
            </button>
            <div className="flex-1 text-xs sm:text-sm text-gray-300 leading-relaxed">Ejemplo: “DNI 12 34 56 78 presente” o “RUT 12.345.678-K ausente”.</div>
            <button onClick={postSingle} disabled={!doc} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold bg-white text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto text-sm sm:text-base">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a2 2 0 012-2h3.586a1 1 0 01.707.293l6.414 6.414a1 1 0 010 1.414l-6.586 6.586A2 2 0 018 17H5a2 2 0 01-2-2V4zm5 1H5v10h3v-2.586l5.293-5.293L11.414 7H8V5z" clipRule="evenodd"/></svg>
              Guardar
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 px-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white text-base" placeholder="Documento (DNI/RUT/CPF/CURP...)" value={doc} onChange={e=>setDoc(e.target.value.replace(/[^0-9a-z]/gi,"").toUpperCase())} aria-label="Documento" />
            <div className="sm:col-span-2">
              <div className="inline-flex w-full sm:w-auto bg-gray-900 border border-gray-700 rounded-lg p-1">
                <button type="button" onClick={()=>setStatus('present')} className={`flex-1 sm:flex-none px-3 py-2 rounded-md text-sm sm:text-base font-medium ${status==='present' ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}>Presente</button>
                <button type="button" onClick={()=>setStatus('absent')} className={`flex-1 sm:flex-none px-3 py-2 rounded-md text-sm sm:text-base font-medium ${status==='absent' ? 'bg-white text-black' : 'text-gray-300 hover:text-white'}`}>Ausente</button>
              </div>
            </div>
          </div>

          {lastHeard && (
            <div className="mt-3 text-xs text-gray-300">
              <div className="text-gray-400 font-medium">Último por voz</div>
              <div className="font-mono break-words bg-gray-900 border border-gray-800 rounded p-2 mt-1">{lastHeard}</div>
            </div>
          )}
        </div>

        <div className="mt-6 sm:mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Asistencias de hoy — {crewName}</h2>
            <button onClick={fetchToday} className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a1 1 0 011-1h2a1 1 0 110 2H6.414l1.293 1.293a7 7 0 11-2 2L4 7.414V9a1 1 0 11-2 0V5a1 1 0 011-1zm10 8a5 5 0 10-4.546 4.978L9 16l3 3-3 3-.454-1.022A7 7 0 1116 12z" clipRule="evenodd"/></svg>
              Actualizar
            </button>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {(listLoading || workersLoading) ? (
              <div className="p-6 text-sm text-gray-500">Cargando registros...</div>
            ) : combinedList.length === 0 ? (
              <div className="p-6 text-sm text-gray-600 space-y-1">
                <div><strong>No hay registros de hoy.</strong></div>
                {workers.length === 0 ? (
                  <div>
                    Esta finca no tiene trabajadores activos. Podés agregarlos desde “Administrador → Trabajadores”.
                  </div>
                ) : (
                  <div>
                    Aún no se registraron asistencias. Usá el campo de documento o la carga por voz para empezar.
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {combinedList.map((item) => (
                  <div key={`${item.doc}-${item.rowId || 'x'}`} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{item.fullname || item.doc}</div>
                      <div className="text-xs text-gray-500">{item.doc}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!item.hasRecord ? (
                        <>
                          <span className="text-xs inline-flex items-center px-2.5 py-1 rounded-full border bg-green-50 text-green-700 border-green-200">Presente</span>
                          <button onClick={() => markAbsent(item.doc)} disabled={!!markingAbsent[item.doc]} className="text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                            {markingAbsent[item.doc] ? (
                              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10" strokeWidth="2" opacity=".25"/><path d="M22 12a10 10 0 00-10-10" strokeWidth="2"/></svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-10.293a1 1 0 00-1.414-1.414L10 8.586 7.707 6.293a1 1 0 10-1.414 1.414L8.586 10l-2.293 2.293a1 1 0 001.414-1.414L11.414 10l2.293-2.293z" clipRule="evenodd"/></svg>
                            )}
                            Marcar ausente
                          </button>
                        </>
                      ) : (
                        <span className={`text-xs inline-flex items-center px-2.5 py-1 rounded-full border ${item.status==='present' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          {item.status==='present' ? 'Presente' : 'Ausente'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
