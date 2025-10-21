import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function TopNav() {
  const { role, logout } = useAuth();
  if (!role) return null;

  const roleLabel = role === "admin" ? "Administrador" : role === "cuadrillero" ? "Cuadrillero" : role;
  const initials = role === "admin" ? "AD" : role === "cuadrillero" ? "CU" : (role?.slice(0,2) || "US").toUpperCase();

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
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gray-900 text-white grid place-items-center text-xs font-bold">
                {initials}
              </div>
              <span className="absolute -right-0 -bottom-0 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white" aria-hidden="true" />
            </div>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-sm font-medium text-gray-900">{roleLabel}</span>
              <span className="text-xs text-gray-500">en línea</span>
            </div>
          </div>
          <button
            onClick={() => logout && logout()}
            className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            aria-label="Cerrar sesión"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4.5A1.5 1.5 0 014.5 3h7a1.5 1.5 0 011.5 1.5V7h-2V5H5v10h6v-2h2v2.5A1.5 1.5 0 0111.5 17h-7A1.5 1.5 0 013 15.5v-11z" clipRule="evenodd"/><path d="M12 10h-5v2h5v3l5-4-5-4v3z"/></svg>
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
