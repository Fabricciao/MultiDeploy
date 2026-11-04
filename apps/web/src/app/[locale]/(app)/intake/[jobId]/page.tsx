import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx } from "@/lib/session";
import { getJob } from "@/lib/intake/process";
import { listCities, cityName } from "@/lib/data/geo";
import { listSources } from "@/lib/data/contacts";
import { pickName } from "@/lib/data/types";
import { ContactForm } from "@/components/contact-form";
import { PropertyForm } from "@/components/property-form";
import { PageHeader } from "@/components/ui";
import { discardIntake, finishContactIntake, finishPropertyIntake } from "../actions";

export default async function ReviewPage({ params }: { params: Promise<{ locale: string; jobId: string }> }) {
  const { locale, jobId } = await params;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("intake");
  if (!/^[0-9a-f-]{36}$/i.test(jobId)) notFound();
  const job = await getJob(ctx, jobId);
  if (!job || job.status !== "needs_review") notFound();
  const [cities, sources] = await Promise.all([listCities(ctx), listSources(ctx)]);
  const cityOpts = cities.map((c) => ({ id: c.id, label: cityName(c, locale) }));
  const { fields, meta, missing } = job.result;
  const d = { ...fields, phone: fields.phone ?? "", email: fields.email ?? "", price: fields.price, parking_count: fields.parking_count ?? 0 };
  return (
    <>
      <PageHeader title={t("reviewTitle")} sub={t("reviewSub", { provider: job.provider })}>
        <form action={discardIntake.bind(null, jobId)}><input type="hidden" name="locale" value={locale} /><button className="btn ghost">{t("discard")}</button></form>
      </PageHeader>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,5fr) minmax(0,7fr)", gap: 20, alignItems: "start" }} className="split">
        <div className="col" style={{ gap: 16 }}>
          {job.input_path && <div className="card"><h2>{t("sourceImage")}</h2><div className="card-b"><img src={`/api/files/${job.input_path}`} alt="" style={{ width: "100%", borderRadius: 6 }} /></div></div>}
          {job.transcript && <div className="card"><h2>{t("transcript")}</h2><div className="card-b"><p style={{ lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{job.transcript}</p></div></div>}
          <p className="note">{t("reviewNote")}</p>
        </div>
        {job.target === "contact"
          ? <ContactForm action={finishContactIntake.bind(null, jobId)} cities={cityOpts} sources={sources.map((s) => ({ id: s.id, label: pickName(s.name, locale) }))} d={d} hints={meta} missing={missing} />
          : <PropertyForm action={finishPropertyIntake.bind(null, jobId)} cities={cityOpts} d={{ ...d, status: "draft" }} missing={missing} hints={meta} />}
      </div>
    </>
  );
}
