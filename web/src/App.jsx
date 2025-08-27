import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Home from "./pages/Home";
import AttendancePage from "./pages/AttendancePage";
import AdminDashboard from "./pages/AdminDashboard";
import { useAuth } from "./contexts/AuthContext";

export default function App() {
  const { role } = useAuth();
  console.log("App role:", role); // debug temporal

  if (!role) return <Login />;

  return (
    <Routes>
      <Route path="/" element={role === "admin" ? <AdminDashboard /> : <Home />} />

      <Route
        path="/finca/:id"
        element={
          role === "cuadrillero"
            ? <AttendancePage />
            : role === "admin"
              ? <AdminDashboard />
              : <Navigate to="/" replace />
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}


