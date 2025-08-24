import React from "react";
import { useParams, Link } from "react-router-dom";
import AttendanceRecorder from "../components/AttendanceRecorder";

export default function AttendancePage(){
  const { id } = useParams();
  const crewId = Number(id) || 1;

  return (
    <div className="min-h-screen p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Asistencia — Finca {crewId}</h1>
        <Link to="/" className="underline">← Volver</Link>
      </div>
      <AttendanceRecorder crewId={crewId} />
    </div>
  );
}
