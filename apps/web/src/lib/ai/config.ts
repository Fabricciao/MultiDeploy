import "server-only";

/** Capacités IA disponibles, déduites des variables d'environnement. Aucun modèle n'est « deviné » : ils sont configurés. */
export const aiConfig = () => {
  const e = process.env;
  return {
    stt: e.OPENAI_API_KEY && e.OPENAI_STT_MODEL ? { provider: "openai" as const, key: e.OPENAI_API_KEY, model: e.OPENAI_STT_MODEL } : null,
    extract: e.ANTHROPIC_API_KEY ? { provider: "anthropic" as const, key: e.ANTHROPIC_API_KEY, model: e.ANTHROPIC_MODEL ?? "claude-sonnet-5-5" } : null,
    vision: e.ANTHROPIC_API_KEY ? { provider: "anthropic" as const, key: e.ANTHROPIC_API_KEY, model: e.ANTHROPIC_VISION_MODEL ?? e.ANTHROPIC_MODEL ?? "claude-sonnet-5-5" } : null,
    image: e.OPENAI_API_KEY && e.OPENAI_IMAGE_MODEL ? { provider: "openai" as const, key: e.OPENAI_API_KEY, model: e.OPENAI_IMAGE_MODEL } : null,
  };
};
export const CREDIT_COST = { poster_faithful: 0, poster_enhanced: 2, poster_creative: 6, intake_voice: 1, intake_photo: 1, intake_text: 0 } as const;
