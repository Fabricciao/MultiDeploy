import "server-only";

/** Capacités IA disponibles, déduites des variables d'environnement. Aucun modèle n'est « deviné » : ils sont configurés. */
export type LlmCfg = { provider: "anthropic" | "openai_compat"; baseUrl: string; key: string; model: string };
export type SttCfg = { baseUrl: string; key: string; model: string };

/**
 * Fournisseurs interchangeables.
 *  - Extraction / traduction : Anthropic (ANTHROPIC_API_KEY) ou tout service compatible OpenAI « chat/completions » (DeepSeek, OpenAI, Groq, Mistral, Ollama…) via
 *    LLM_PROVIDER=openai_compat + LLM_BASE_URL + LLM_API_KEY + LLM_MODEL.
 *  - Lecture de documents manuscrits (image) : Anthropic, ou un modèle compatible OpenAI AVEC vision (LLM_VISION_MODEL). Un modèle texte seul (ex. DeepSeek chat) ne convient pas.
 *  - Transcription : tout service compatible « /audio/transcriptions » (OpenAI, Groq, faster-whisper-server auto-hébergé) via STT_BASE_URL / STT_API_KEY / STT_MODEL.
 */
export const aiConfig = () => {
  const e = process.env;
  const compat = e.LLM_PROVIDER === "openai_compat" && e.LLM_BASE_URL && e.LLM_MODEL;
  const base = (e.LLM_BASE_URL ?? "").replace(/\/+$/, "");
  const anthropic = (model: string): LlmCfg => ({ provider: "anthropic", baseUrl: "https://api.anthropic.com", key: e.ANTHROPIC_API_KEY!, model });
  const extract: LlmCfg | null = compat ? { provider: "openai_compat", baseUrl: base, key: e.LLM_API_KEY ?? "", model: e.LLM_MODEL! }
    : e.ANTHROPIC_API_KEY ? anthropic(e.ANTHROPIC_MODEL ?? "claude-sonnet-5-5") : null;
  const vision: LlmCfg | null = e.ANTHROPIC_API_KEY ? anthropic(e.ANTHROPIC_VISION_MODEL ?? e.ANTHROPIC_MODEL ?? "claude-sonnet-5-5")
    : e.LLM_PROVIDER === "openai_compat" && e.LLM_BASE_URL && e.LLM_VISION_MODEL ? { provider: "openai_compat", baseUrl: base, key: e.LLM_API_KEY ?? "", model: e.LLM_VISION_MODEL } : null;
  const sttBase = (e.STT_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const sttKey = e.STT_API_KEY ?? e.OPENAI_API_KEY ?? "", sttModel = e.STT_MODEL ?? e.OPENAI_STT_MODEL;
  const stt: SttCfg | null = sttModel && (sttKey || e.STT_BASE_URL) ? { baseUrl: sttBase, key: sttKey, model: sttModel } : null;
  return {
    stt, extract, vision,
    image: e.OPENAI_API_KEY && e.OPENAI_IMAGE_MODEL ? { provider: "openai" as const, key: e.OPENAI_API_KEY, model: e.OPENAI_IMAGE_MODEL } : null,
  };
};
export const CREDIT_COST = { poster_faithful: 0, poster_enhanced: 2, poster_creative: 6, intake_voice: 1, intake_photo: 1, intake_text: 0 } as const;
