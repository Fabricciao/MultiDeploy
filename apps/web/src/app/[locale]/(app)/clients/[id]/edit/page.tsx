import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCtx } from "@/lib/session";
import { getContact } from "@/lib/data/contacts";
import { ContactForm } from "@/components/contact-form";
import { PageHeader } from "@/components/ui";
import { saveContact } from "../../actions";

export default async function EditClientPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const ctx = await getCtx(locale);
  const t = await getTranslations("clients");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getContact(ctx, id);
  if (!data) notFound();
  const c = data.c;
  return (<><PageHeader title={t("editTitle")} /><ContactForm edit action={saveContact.bind(null, id)} cities={[]} sources={[]} d={{ ...c, phone: c.phones?.[0]?.e164 ?? "", email: c.emails?.[0]?.email ?? "" }} /></>);
}
