"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, ClipboardCheck, Mic, Square, Star, X } from "lucide-react";
import { saveDebriefAction, type DebriefState } from "@/app/[locale]/(app)/visits/actions";

const MAX = 120;

/** Compte rendu de visite en 10 secondes : note, intérêt, note écrite ou mémo vocal. */
export function VisitDebrief({ visitId, name, open: startOpen = false }: { visitId: string; name: string; open?: boolean }) {
  const t = useTranslations("debrief");
  const locale = useLocale();
  const [open, setOpen] = useState(startOpen);
  const [state, action, pending] = useActionState<DebriefState, FormData>(saveDebriefAction.bind(null, visitId, name), null);
  const [rating, setRating] = useState(0);
  const [interest, setInterest] = useState<string>("");
  const [rec, setRec] = useState<"idle" | "recording" | "done" | "denied">("idle");
  const [secs, setSecs] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); mr.current?.stream.getTracks().forEach((x) => x.stop()); }, []);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      r.onstop = () => {
        stream.getTracks().forEach((x) => x.stop());
        const blob = new Blob(chunks, { type: r.mimeType || "audio/webm" });
        const f = new File([blob], r.mimeType.includes("mp4") ? "memo.m4a" : "memo.webm", { type: blob.type });
        const dt = new DataTransfer(); dt.items.add(f); if (fileRef.current) fileRef.current.files = dt.files;
        setUrl(URL.createObjectURL(blob)); setRec("done");
      };
      r.start(); mr.current = r; setSecs(0); setRec("recording");
      timer.current = setInterval(() => setSecs((s) => { if (s + 1 >= MAX) stop(); return s + 1; }), 1000);
    } catch { setRec("denied"); }
  }
  function stop() { if (timer.current) clearInterval(timer.current); if (mr.current && mr.current.state !== "inactive") mr.current.stop(); }

  if (state?.ok) return <span className="badge ok"><Check size={12} aria-hidden />{state.moved ? t("savedMoved") : t("saved")}</span>;
  if (!open) return <button type="button" className="btn sm pri" onClick={() => setOpen(true)}><ClipboardCheck size={14} aria-hidden />{t("open")}</button>;
  return (
    <form action={action} className="debrief">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="rating" value={rating || ""} />
      <input type="hidden" name="interest" value={interest} />
      <input ref={fileRef} type="file" name="audio" accept="audio/*" hidden />
      <div className="row" style={{ gap: 4 }} role="radiogroup" aria-label={t("rating")}>
        <span className="lbl" style={{ marginInlineEnd: 6 }}>{t("rating")}</span>
        {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={String(n)} className={`star ${n <= rating ? "on" : ""}`} onClick={() => setRating(n)}><Star size={18} aria-hidden /></button>)}
      </div>
      <div className="seg" role="radiogroup" aria-label={t("interest")}>
        {(["offer", "yes", "no"] as const).map((k) => <button key={k} type="button" role="radio" aria-checked={interest === k} className={interest === k ? "on" : ""} onClick={() => setInterest(k)}>{t(`i.${k}`)}</button>)}
      </div>
      <textarea name="note" className="input" rows={2} maxLength={2000} placeholder={t("note")} aria-label={t("note")} />
      <div className="row wrap" style={{ gap: 8 }}>
        {rec === "recording" ? <button type="button" className="btn sm" onClick={stop}><Square size={13} aria-hidden />{t("stop")} · <span className="tab ltr">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span></button>
          : <button type="button" className="btn sm ghost" onClick={start}><Mic size={14} aria-hidden />{rec === "done" ? t("again") : t("record")}</button>}
        {url && <audio controls src={url} style={{ height: 32, maxWidth: 220 }} />}
        {rec === "denied" && <span className="note err">{t("micDenied")}</span>}
        <span className="sp" />
        <button type="button" className="btn sm ghost icon" aria-label={t("close")} onClick={() => setOpen(false)}><X size={14} aria-hidden /></button>
        <button className="btn sm pri" disabled={pending || !rating || !interest || rec === "recording"}>{pending ? t("saving") : t("save")}</button>
      </div>
      {state?.error && <span role="alert" className="err note">{t(`errors.${state.error === "audio" ? "audio" : "generic"}`)}</span>}
    </form>
  );
}
