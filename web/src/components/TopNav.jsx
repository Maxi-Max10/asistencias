import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function TopNav() {
  const { role, logout } = useAuth();
  if (!role) return null;

  const roleLabel = role === "admin" ? "Administrador" : role === "cuadrillero" ? "Cuadrillero" : role;
  const initials = role === "admin" ? "AD" : role === "cuadrillero" ? "CU" : (role?.slice(0,2) || "US").toUpperCase();
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  React.useEffect(() => {
    function onDocClick(e){
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Cerrar con Escape
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    if (open) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="inline-flex items-center gap-2 text-gray-900 font-semibold">
          <span className="w-8 h-8 rounded-lg bg-black text-white grid place-items-center text-sm">A</span>
          <span className="hidden sm:inline">Asistencias</span>
        </Link>

        {/* Right: user + actions */}
        <div className="flex items-center gap-3">

          {role === "admin" ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setOpen((v)=>!v)}
                className={`inline-flex items-center gap-2 text-sm font-medium pl-2 pr-2.5 py-1.5 rounded-lg border text-gray-700 hover:bg-gray-50 transition 
                ${open ? 'border-gray-400 bg-gray-50' : 'border-gray-300'}`}
                aria-haspopup="menu" aria-expanded={open} aria-controls="user-menu"
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white text-xs font-semibold">AD</span>
                <span className="hidden sm:inline">Administrador</span>
                <svg className={`w-4 h-4 opacity-70 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
              </button>
              {open && (
                <div id="user-menu" role="menu" aria-label="Menú de usuario" className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg shadow-black/10 ring-1 ring-black/5 origin-top-right transform transition-all duration-150 ease-out scale-100 opacity-100">
                  {/* caret */}
                  <div className="absolute right-6 -top-2 w-3 h-3 bg-white border border-gray-200 rotate-45" />
                  <div className="py-2">
                    <div className="px-3 pb-2 text-xs text-gray-500">Sesión</div>
                    <button
                      onClick={() => logout && logout()}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      role="menuitem" tabIndex={0}
                    >
                      <svg className="w-4 h-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4.5A1.5 1.5 0 014.5 3h7a1.5 1.5 0 011.5 1.5V7h-2V5H5v10h6v-2h2v2.5A1.5 1.5 0 0111.5 17h-7A1.5 1.5 0 013 15.5v-11z" clipRule="evenodd"/><path d="M12 10h-5v2h5v3l5-4-5-4v3z"/></svg>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => logout && logout()}
              className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              aria-label="Cerrar sesión"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4.5A1.5 1.5 0 014.5 3h7a1.5 1.5 0 011.5 1.5V7h-2V5H5v10h6v-2h2v2.5A1.5 1.5 0 0111.5 17h-7A1.5 1.5 0 013 15.5v-11z" clipRule="evenodd"/><path d="M12 10h-5v2h5v3l5-4-5-4v3z"/></svg>
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
