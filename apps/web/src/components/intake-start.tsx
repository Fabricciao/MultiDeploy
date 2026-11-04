"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mic, PenLine, ScanLine, Square } from "lucide-react";
import { startIntake, type IntakeState } from "@/app/[locale]/(app)/intake/actions";

type Mode = "voice" | "scan" | "text";
const MAX_SECONDS = 180;

export function IntakeStart({ mode, target, caps }: { mode: Mode; target: "contact" | "property"; caps: { stt: boolean; vision: boolean } }) {
  const t = useTranslations("intake");
  const locale = useLocale();
  const [state, action, pending] = useActionState<IntakeState, FormData>(startIntake, null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rec, setRec] = useState<"idle" | "recording" | "done" | "denied">("idle");
  const [secs, setSecs] = useState(0);
  const [level, setLevel] = useState(0);
  const mr = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => () => { timer.current && clearInterval(timer.current); mr.current?.stream.getTracks().forEach((x) => x.stop()); }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((x) => x.stop());
        const blob = new Blob(chunks, { type: r.mimeType || "audio/webm" });
        const f = new File([blob], r.mimeType.includes("mp4") ? "dictee.m4a" : "dictee.webm", { type: blob.type });
        const dt = new DataTransfer(); dt.items.add(f); if (fileRef.current) fileRef.current.files = dt.files;
        setUrl(URL.createObjectURL(blob)); setRec("done");
      };
      // niveau sonore
      const ac = new AudioContext(), src = ac.createMediaStreamSource(stream), an = ac.createAnalyser(); an.fftSize = 256; src.connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      r.start(); mr.current = r; setSecs(0); setRec("recording");
      timer.current = setInterval(() => { an.getByteFrequencyData(buf); setLevel(Math.min(1, buf.reduce((a, b) => a + b, 0) / buf.length / 90)); setSecs((s) => { if (s + 1 >= MAX_SECONDS) stop(); return s + 1; }); }, 1000 / 1);
    } catch { setRec("denied"); }
  }
  function stop() { timer.current && clearInterval(timer.current); if (mr.current && mr.current.state !== "inactive") mr.current.stop(); }
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  return (
    <form action={action} className="col" style={{ gap: 16, maxWidth: 640 }}>
      <input type="hidden" name="locale" value={locale} /><input type="hidden" name="mode" value={mode} /><input type="hidden" name="target" value={target} />
      {mode === "voice" && (
        <div className="card"><div className="card-b col" style={{ gap: 14, alignItems: "center", textAlign: "center" }}>
          {!caps.stt && <div className="note" style={{ color: "var(--warn)" }} role="status">{t("sttMissing")}</div>}
          <p className="muted">{t(target === "contact" ? "voiceHintContact" : "voiceHintProperty")}</p>
          <div className="tab" style={{ fontSize: 44, fontWeight: 300 }} aria-live="off">{mmss}</div>
          <div style={{ width: 240, height: 8, borderRadius: 4, background: "var(--line)", overflow: "hidden" }}><div style={{ width: `${Math.round(level * 100)}%`, height: "100%", background: "var(--accent)", transition: "width .2s" }} /></div>
          {rec !== "recording" ? <button type="button" className="btn pri" style={{ height: 48, paddingInline: 22 }} onClick={start}><Mic size={18} aria-hidden />{rec === "done" ? t("redo") : t("record")}</button>
            : <button type="button" className="btn" style={{ height: 48, paddingInline: 22, color: "var(--danger)" }} onClick={stop}><Square size={16} fill="currentColor" aria-hidden />{t("stop")}</button>}
          {rec === "denied" && <div role="alert" className="err">{t("micDenied")}</div>}
          {url && <audio controls src={url} style={{ width: "100%" }} />}
          <input ref={fileRef} type="file" name="audio" hidden />
          <button className="btn pri" disabled={pending || rec !== "done"}>{pending ? t("analyzing") : t("analyze")}</button>
        </div></div>
      )}
      {mode === "scan" && (
        <div className="card"><div className="card-b col" style={{ gap: 12 }}>
          {!caps.vision && <div className="note" style={{ color: "var(--warn)" }} role="status">{t("visionMissing")}</div>}
          <p className="muted">{t("scanHint")}</p>
          <input type="file" name="image" accept="image/*" capture="environment" className="input" style={{ height: "auto", padding: 6 }} aria-label={t("choosePhoto")} />
          <button className="btn pri" disabled={pending}>{pending ? t("analyzing") : t("analyze")}</button>
        </div></div>
      )}
      {mode === "text" && (
        <div className="card"><div className="card-b col" style={{ gap: 12 }}>
          <p className="muted">{t("textHint")}</p>
          <textarea name="text" className="input" style={{ minHeight: 140 }} placeholder={t(target === "contact" ? "textExampleContact" : "textExampleProperty")} maxLength={8000} required />
          <button className="btn pri" disabled={pending}>{pending ? t("analyzing") : t("analyze")}</button>
        </div></div>
      )}
      {state?.error && <div role="alert" className="err">{t(`errors.${state.error}`)}</div>}
      <p className="note">{t("privacy")}</p>
    </form>
  );
}
export const MODES = [{ key: "voice", icon: Mic }, { key: "scan", icon: ScanLine }, { key: "text", icon: PenLine }] as const;
