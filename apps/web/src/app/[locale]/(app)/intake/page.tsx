import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mic, PenLine, ScanLine } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCtx } from "@/lib/session";
import { aiConfig } from "@/lib/ai/config";
import { IntakeStart } from "@/components/intake-start";
import { PageHeader } from "@/components/ui";

export default async function IntakePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ mode?: string; target?: string }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  await getCtx(locale);
  const t = await getTranslations("intake");
  const mode = (["voice", "scan", "text"] as const).find((m) => m === sp.mode) ?? "voice";
  const target = sp.target === "property" ? "property" : "contact";
  const cfg = aiConfig();
  const href = (m: string, tg: string) => `/intake?mode=${m}&target=${tg}`;
  return (
    <>
      <PageHeader title={t("title")} sub={t("sub")} />
      <div className="row wrap" style={{ gap: 12, marginBottom: 16 }}>
        <div className="seg">{([["voice", Mic], ["scan", ScanLine], ["text", PenLine]] as const).map(([m, Icon]) => <Link key={m} href={href(m, target)} className={m === mode ? "on" : ""}><Icon size={14} aria-hidden />{t(`modes.${m}`)}</Link>)}</div>
        <div className="seg">{(["contact", "property"] as const).map((tg) => <Link key={tg} href={href(mode, tg)} className={tg === target ? "on" : ""}>{t(`targets.${tg}`)}</Link>)}</div>
      </div>
      <IntakeStart key={`${mode}-${target}`} mode={mode} target={target} caps={{ stt: !!cfg.stt, vision: !!cfg.vision }} />
    </>
  );
}
