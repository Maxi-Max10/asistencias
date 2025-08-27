import React, { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [role, setRole] = useState(() => {
    try { return localStorage.getItem("role") || null; } catch { return null; }
  });

  useEffect(() => {
    try {
      if (role) localStorage.setItem("role", role);
      else localStorage.removeItem("role");
    } catch {}
  }, [role]);

  const login = (r) => { try { localStorage.setItem("role", r); } catch {} setRole(r); };
  const logout = () => { try { localStorage.removeItem("role"); } catch {} setRole(null); };

  return <AuthContext.Provider value={{ role, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }