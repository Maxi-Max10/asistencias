import React from "react";

export default function Modal({ open, onClose, title, children, footer }){
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 rounded-xl border border-white/10 bg-[#242A38] shadow-xl shadow-black/40">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-slate-100 text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-white px-1.5 py-0.5">✕</button>
        </div>
        <div className="px-5 py-4 text-slate-200">
          {children}
        </div>
        {footer && (
          <div className="px-5 py-4 border-t border-white/10 bg-[#2A3040] rounded-b-xl flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
