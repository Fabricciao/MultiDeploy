export type Names = { fr: string | null; he: string | null; en: string | null };
export const pickName = (n: Names | null | undefined, locale: string) => (n && (n[locale as keyof Names] || n.fr || n.he || n.en)) || "";
export type MatchReason = { code: "over_budget" | "under_budget" | "area_below" | "floor_below" | "has" | "missing"; pct?: number; min?: number; key?: string };
