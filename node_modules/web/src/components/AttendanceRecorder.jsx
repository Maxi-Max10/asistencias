import React, { useEffect, useRef, useState } from "react";
const API = import.meta.env.VITE_API || "http://127.0.0.1:4000";

/* ========= Speech ========= */
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

/* ========= Helpers ========= */
const norm = (s="") => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();

// SOLO 2 estados: presente / ausente
function statusFromTokens(tokens, i){
  const t = norm(tokens[i] || "");
  if (t === "presente") return { status: "present", inc: 1 };
  if (t === "ausente" || t === "falta" || t === "falto" || t === "faltó")
    return { status: "absent", inc: 1 };
  return null;
}

/** Parser por tokens LATAM (robusto) */
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
  const cleanChunk = (tk) => tk.replace(/[^0-9a-z]/gi,""); // alfanum
  const isDigits = (s) => /^[0-9]+$/.test(s);

  let mode = "numeric"; // numeric | rut | alnum
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
      // alfanumérico (CURP/RFC o RUT con K)
      if (id.length < 6) return;
      if (id.length > 18) id = id.slice(0, 18);
    }
    out.push({ doc: id, status });
  };

  let capturing = false, buf = "", lastKw = null;
  const pairs = [];

  for (let i=0; i<tokens.length; i++){
    const raw = tokens[i];
    const t = norm(raw);

    // 1) keyword → seteo modo y comienzo captura
    if (KW.has(t)) { capturing = true; buf=""; lastKw = t; setModeByKw(t); continue; }

    // 2) estado ANTES de tocar buffer
    const st = statusFromTokens(tokens, i);
    if (st) {
      if (buf) pushDoc(buf, st.status, pairs);
      capturing = false; buf = ""; lastKw = null; mode = "numeric";
      i += (st.inc - 1);
      continue;
    }

    // 3) palabras a ignorar
    if (SKIP.has(t)) continue;

    // 4) anexar según modo
    const chunk = cleanChunk(raw);
    if (!chunk) continue;

    if (mode === "numeric") {
      // solo dígitos
      const d = chunk.replace(/\D/g,"");
      if (!d) continue;
      if (/^0\d{1,2}$/.test(d) && isDigits(buf)) buf += d.slice(1);
      else buf += d;
    } else if (mode === "rut") {
      // dígitos + posible 'K' final
      if (/^[0-9]+$/.test(chunk)) {
        if (/^0\d{1,2}$/.test(chunk) && isDigits(buf)) buf += chunk.slice(1);
        else buf += chunk;
      } else if (chunk.length === 1 && /k/i.test(chunk) && isDigits(buf) && buf.length >= 6) {
        buf += "K";
      } // otras letras: ignorar
    } else { // alnum (CURP/RFC)
      buf += chunk.toUpperCase();
    }

    if (buf.length > 24) buf = buf.slice(-18);
  }

  // último estado por doc
  const map = new Map();
  for (const p of pairs) map.set(p.doc, p.status);
  return Array.from(map, ([doc,status]) => ({ doc, status }));
}

export default function AttendanceRecorder({ crewId = 1, onSaved }) {
  const [doc, setDoc] = useState("");
  const [status, setStatus] = useState("present");
  const [lastHeard, setLastHeard] = useState("");
  const { start, stop, active } = useSpeech(setLastHeard);

  // refs para estado interno
  const queueRef = useRef(new Map()); // doc -> status
  const timerRef = useRef(null);
  const sendingRef = useRef(false);

  // ref con el crewId SIEMPRE actualizado (evita closures viejos)
  const crewIdRef = useRef(crewId);
  useEffect(() => { crewIdRef.current = crewId; }, [crewId]);

  // Al cambiar de finca: detener grabación, limpiar cola/timers y reset UI
  useEffect(() => {
    try { stop(); } catch {}
    queueRef.current.clear();
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setLastHeard("");
    setDoc("");
    setStatus("present");
    // (opcional) precargar workers de la nueva finca
    fetch(`${API}/api/workers?crewId=${crewId}`, { cache: "no-store" }).catch(() => {});
  }, [crewId, stop]);

  // Flush en lote (usa SIEMPRE el crewId actual)
  const flushQueue = async () => {
    if (sendingRef.current) return;
    const items = Array.from(queueRef.current, ([d, s]) => ({ doc: d, status: s }));
    if (!items.length) return;

    sendingRef.current = true;
    const currentCrew = Number(crewIdRef.current || 1);
    try {
      await fetch(`${API}/api/attendance/bulk?crewId=${currentCrew}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewId: currentCrew, items })
      });
      queueRef.current.clear();
      setDoc("");
      onSaved?.();
    } catch (e) {
      console.error("Registrar asistencia (bulk):", e);
    } finally {
      sendingRef.current = false;
    }
  };

  const enqueueItems = (items) => {
    for (const it of items) queueRef.current.set(it.doc, it.status);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushQueue, 250);
  };

  // Voz → parse LATAM y encolado (tu lógica tal cual)
  useEffect(() => {
    if (!lastHeard) return;
    const phrase = lastHeard.toLowerCase();

    const items = extractPairsLatam(phrase);
    if (items.length) {
      enqueueItems(items);
      const last = items[items.length - 1];
      setDoc(last.doc);
      setStatus(last.status);
      return;
    }

    const kwRegexGlobal = /(dni|documento|c[eé]dula|ci|identidad|run|rut|cpf|curp|rfc|rg)/gi;
    let m, lastKw = null; while ((m = kwRegexGlobal.exec(phrase)) !== null) lastKw = m[1].toLowerCase();

    const statusMatch = phrase.match(/\b(presente|ausente|falta|faltó|falto)\b/i);
    let st = null;
    let search = phrase;
    if (statusMatch) {
      st = /presente/i.test(statusMatch[1]) ? "present" : "absent";
      search = phrase.slice(0, statusMatch.index);
    }

    const cleaned = search.replace(
      /\b(y|con|coma|punto|de|del|el|la|cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte|treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa|cien|ciento|doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos|mil|millon|millón|millones|billon|billón|billones|bien|esta|está|cargando)\b/gi,
      " "
    );

    const tail = lastKw ? cleaned.split(new RegExp(`${lastKw}`, "i")).slice(-1)[0] : cleaned;

    let singleDoc = "";
    if (lastKw === "curp" || lastKw === "rfc") {
      const alnum = (tail.match(/[0-9a-z]/gi) || []).join("").toUpperCase();
      if (alnum.length >= 6) singleDoc = alnum.slice(0, 18);
    } else {
      const digits = (tail.match(/[0-9]/g) || []).join("");
      if (digits) {
        singleDoc = digits.replace(/^0+/, "");
        if (singleDoc.length > 12) singleDoc = singleDoc.slice(-12);
        if (singleDoc.length < 5) singleDoc = "";
      }
    }

    if (singleDoc) setDoc(singleDoc);
    if (st) setStatus(st);
    if (singleDoc && st) enqueueItems([{ doc: singleDoc, status: st }]);
  }, [lastHeard]);

  // Modo manual (también envía crewId en URL y body)
  const postSingle = async (d, s) => {
    if (!d || !s) return;
    const currentCrew = Number(crewIdRef.current || 1);
    try {
      await fetch(`${API}/api/attendance?crewId=${currentCrew}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewId: currentCrew, doc: d, status: s })
      });
      setDoc("");
      onSaved?.();
    } catch (e) {
      console.error("Registrar asistencia (single):", e);
    }
  };

  return (
    <div className="border rounded p-3 space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={active ? stop : start}
          className={`px-3 py-2 rounded ${active ? 'bg-red-500 text-white' : 'bg-green-600 text-white'}`}>
          {active ? "Detener" : "Grabar por voz"}
        </button>
        <span className="text-sm opacity-70">
          Ejemplo: “DNI 12 34 56 78 presente  ||  RUT 12.345.678-K ausente”.
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          className="border rounded px-2 py-2"
          placeholder="Documento (DNI/RUT/CPF/CURP...)"
          value={doc}
          onChange={e => setDoc(e.target.value.replace(/[^0-9a-z]/gi, "").toUpperCase())}
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1">
            <input type="radio" name="st" value="present"
              checked={status === 'present'} onChange={() => setStatus('present')} />
            Presente
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" name="st" value="absent"
              checked={status === 'absent'} onChange={() => setStatus('absent')} />
            Ausente
          </label>
        </div>
        <button
          onClick={() => postSingle(doc.trim(), status)}
          className="px-4 py-2 bg-blue-600 text-white rounded">
          Guardar
        </button>
      </div>

      {lastHeard && (
        <div className="text-xs">
          <div className="opacity-70">Último por voz:</div>
          <div className="font-mono break-words">{lastHeard}</div>
        </div>
      )}
    </div>
  );
}

