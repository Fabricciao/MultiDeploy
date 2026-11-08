import { getTranslations } from "next-intl/server";
import { Plus } from "lucide-react";
import { addTaskFormAction } from "@/app/[locale]/(app)/tasks/actions";

type Opt = { id: string; label: string };

/** Ajout rapide d'une tâche : titre, date, heure (synchronisée avec Google Agenda si connecté), client ou bien lié, et collègue (gérant). */
export async function TaskAdd({ locale, contacts = [], agents = [], contactId, propertyId, autoFocus = false, compact = false }: { compact?: boolean; locale: string; contacts?: Opt[]; agents?: Opt[]; contactId?: string; propertyId?: string; autoFocus?: boolean }) {
  const t = await getTranslations("tasks");
  return (
    <form action={addTaskFormAction} className={`task-add ${compact ? "compact" : ""}`}>
      <input type="hidden" name="locale" value={locale} />
      {contactId && <input type="hidden" name="contact" value={contactId} />}
      {propertyId && <input type="hidden" name="property" value={propertyId} />}
      <input name="title" className="input" placeholder={t("placeholder")} required maxLength={200} aria-label={t("titleLabel")} autoFocus={autoFocus} />
      <input name="due" type="date" className="input" aria-label={t("due")} />
      <input name="time" type="time" className="input" aria-label={t("time")} title={t("timeHint")} />
      {!contactId && contacts.length > 0 && <select name="contact" className="input" defaultValue="" aria-label={t("client")}><option value="">{t("noClient")}</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>}
      {agents.length > 1 && <select name="assignee" className="input" defaultValue="" aria-label={t("assignee")}><option value="">{t("me")}</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>}
      <button className="btn pri"><Plus size={15} aria-hidden />{t("add")}</button>
    </form>
  );
}
