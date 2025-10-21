import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((ts) => ts.filter(t => t.id !== id));
  }, []);

  const show = useCallback((opts) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    const t = {
      id,
      title: opts?.title || "",
      description: opts?.description || "",
      variant: opts?.variant || "default", // default | success | destructive | info
      duration: Math.min(Math.max(opts?.duration ?? 3000, 1500), 10000),
    };
    setToasts((ts) => [...ts, t]);
    // auto dismiss
    setTimeout(() => remove(id), t.duration);
    return id;
  }, [remove]);

  const value = useMemo(() => ({ showToast: show, removeToast: remove }), [show, remove]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {/* Toast container */}
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999 }}>
        <div className="flex flex-col gap-2">
          {toasts.map(t => (
            <div
              key={t.id}
              className={[
                "min-w-[260px] max-w-sm rounded-md border px-3 py-2 shadow-lg",
                "backdrop-blur-sm",
                t.variant === "destructive" ? "border-red-500/30 bg-red-900/40 text-red-100" :
                t.variant === "success" ? "border-emerald-500/30 bg-emerald-900/40 text-emerald-100" :
                t.variant === "info" ? "border-sky-500/30 bg-sky-900/40 text-sky-100" :
                "border-white/10 bg-[#2A3040] text-slate-100",
              ].join(" ")}
            >
              {t.title && <div className="text-sm font-semibold leading-tight">{t.title}</div>}
              {t.description && <div className="mt-0.5 text-xs text-slate-300/90">{t.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
