"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copie un texte dans le presse-papiers et confirme pendant 2 secondes. */
export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="btn" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000); } catch { /* presse-papiers refusé */ } }}>{ok ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{ok ? done : label}</button>;
}
