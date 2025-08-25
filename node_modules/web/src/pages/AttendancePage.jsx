import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import AttendanceRecorder from "../components/AttendanceRecorder";
import TodayList from "../components/TodayList";

export default function AttendancePage() {
  const { id } = useParams();
  const crewId = Number(id) || 1;
  const [refreshKey, setRefreshKey] = useState(0);
  const handleSaved = () => setRefreshKey(k => k + 1);

  return (
    <div className="min-h-screen p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Asistencia — Finca {crewId}</h1>
        <Link to="/" className="underline">← Volver</Link>
      </div>

      {/* Remount al cambiar de finca */}
      <AttendanceRecorder key={`rec-${crewId}`} crewId={crewId} onSaved={handleSaved} />
      <TodayList        key={`list-${crewId}`} crewId={crewId} refreshKey={refreshKey} />
    </div>
  );
}
