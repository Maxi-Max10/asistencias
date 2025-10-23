import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./components/ui/toast";
import "./index.css";
import faviconUrl from "./assets/favicon.ico";

// Set custom favicon from src/assets/favicon.ico
(() => {
  try {
    const link = document.querySelector("link[rel='icon']") || (() => {
      const el = document.createElement("link");
      el.setAttribute("rel", "icon");
      document.head.appendChild(el);
      return el;
    })();
    link.setAttribute("type", "image/x-icon");
    link.setAttribute("href", faviconUrl);
  } catch {}
})();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
