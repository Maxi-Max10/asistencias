import Login from "../components/Login.jsx";
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

// Parser LATAM (igual al que ya tenías)
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

/* ======== Página ======== */
export default function AttendancePage() {
  const { logout, role } = useAuth();
  const navigate = useNavigate();
  const params = useParams(); // /finca/:id
  const crewId = useMemo(() => Number(params.id || 1), [params.id]);

  // if user lost role or is not cuadrillero, redirect
  useEffect(() => {
    if (!role) {
      navigate("/", { replace: true });
    } else if (role !== "cuadrillero") {
      // optional: admins see dashboard
      navigate("/", { replace: true });
    }
  }, [role, navigate]);

  const [doc, setDoc] = useState("");
  const [status, setStatus] = useState("present");
  const [lastHeard, setLastHeard] = useState("");
  const [rows, setRows] = useState([]);
  const { start, stop, active } = useSpeech(setLastHeard);

  const queueRef = useRef(new Map());
  const timerRef = useRef(null);
  const sendingRef = useRef(false);

  // Reset al cambiar de finca
  useEffect(()=>{
    queueRef.current.clear();
    if (timerRef.current) clearTimeout(timerRef.current);
    setLastHeard("");
    setDoc("");
    setStatus("present");
    fetchToday(); // refrescar listado de la finca nueva
  }, [crewId]);

  // Forzar carga del endpoint (opcional)
  useEffect(()=>{
    fetch(`${API}/api/workers?crewId=${crewId}`, { cache: "no-store" }).catch(()=>{});
  }, [crewId]);

  async function fetchToday(){
    try{
      const r = await fetch(`${API}/api/attendance/today?crewId=${crewId}&_=${Date.now()}`, { cache: "no-store" });
      const data = await r.json();
      setRows(Array.isArray(data) ? data : []);
    }catch{}
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

  // Voz → parseo LATAM + fallback
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

    // Fallback: un solo doc + estado
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

  useEffect(()=>{ fetchToday(); }, []); // primer carga

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-semibold">Asistencia — Finca {crewId}</h1>
        <Link to="/" className="text-sm">← Volver</Link>
      </div>

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2>Asistencia — Cuadrillero</h2>
        <button
          onClick={() => { logout && logout(); }}
          style={{
            background: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: 4,
            padding: "6px 12px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          Cerrar sesión
        </button>
      </header>

      <div className="border rounded p-3 space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={active?stop:start}
            className={`px-3 py-2 rounded ${active?'bg-red-600 text-white':'bg-green-600 text-white'}`}
          >
            {active ? "Detener" : "Grabar por voz"}
          </button>
          <span className="text-sm opacity-70">
            Ejemplo: “DNI 12 34 56 78 presente || RUT 12.345.678-K ausente”.
          </span>
          <button
            onClick={postSingle}
            className="ml-auto px-4 py-2 bg-blue-600 text-white rounded"
          >
            Guardar
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            className="border rounded px-2 py-2"
            placeholder="Documento (DNI/RUT/CPF/CURP...)"
            value={doc}
            onChange={e=>setDoc(e.target.value.replace(/[^0-9a-z]/gi,"").toUpperCase())}
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1">
              <input type="radio" name="st" value="present"
                     checked={status==='present'}
                     onChange={()=>setStatus('present')} />
              Presente
            </label>
            <label className="flex items-center gap-1">
              <input type="radio" name="st" value="absent"
                     checked={status==='absent'}
                     onChange={()=>setStatus('absent')} />
              Ausente
            </label>
          </div>
        </div>

        {lastHeard && (
          <div className="text-xs">
            <div className="opacity-70">Último por voz:</div>
            <div className="font-mono break-words">{lastHeard}</div>
          </div>
        )}
      </div>

      <div className="mt-5 border rounded">
        <div className="px-3 py-2 font-semibold">Asistencias de hoy</div>
        {rows.length === 0 ? (
          <div className="px-3 py-6 text-sm opacity-70">Sin registros aún.</div>
        ) : rows.map(r=>(
          <div key={r.id} className="px-3 py-3 border-t flex items-center justify-between">
            <div>
              <div className="font-semibold">{r.fullname || r.doc}</div>
              <div className="text-xs opacity-70">{r.doc}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${r.status==='present'?'bg-green-100 text-green-700':'bg-rose-100 text-rose-700'}`}>
              {r.status==='present' ? 'Presente' : 'Ausente'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
