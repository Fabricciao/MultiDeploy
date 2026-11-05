"use client";
import { useEffect } from "react";
/** Enregistre le service worker (production uniquement, pour ne pas gêner le développement). */
export function SwRegister() {
  useEffect(() => { if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {}); }, []);
  return null;
}
