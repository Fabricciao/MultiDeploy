import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aiConfig } from "./config";
import { llmExtract, llmTranslate, transcribe } from "./providers";

const KEYS = ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "LLM_PROVIDER", "LLM_BASE_URL", "LLM_API_KEY", "LLM_MODEL", "LLM_VISION_MODEL", "OPENAI_API_KEY", "OPENAI_STT_MODEL", "STT_BASE_URL", "STT_API_KEY", "STT_MODEL"];
let saved: Record<string, string | undefined>;
beforeEach(() => { saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]])); KEYS.forEach((k) => delete process.env[k]); });
afterEach(() => { KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))); vi.unstubAllGlobals(); });
const json = (o: unknown) => new Response(JSON.stringify(o), { status: 200, headers: { "content-type": "application/json" } });

describe("choix des fournisseurs", () => {
  it("rien configuré → tout désactivé", () => { const c = aiConfig(); expect([c.stt, c.extract, c.vision, c.image]).toEqual([null, null, null, null]); });
  it("DeepSeek (compatible OpenAI) pour le texte, sans vision", () => {
    Object.assign(process.env, { LLM_PROVIDER: "openai_compat", LLM_BASE_URL: "https://api.deepseek.com/", LLM_API_KEY: "k", LLM_MODEL: "m" });
    const c = aiConfig(); expect(c.extract).toMatchObject({ provider: "openai_compat", baseUrl: "https://api.deepseek.com", model: "m" }); expect(c.vision).toBeNull();
  });
  it("texte via DeepSeek + vision via Anthropic", () => {
    Object.assign(process.env, { LLM_PROVIDER: "openai_compat", LLM_BASE_URL: "https://x/v1", LLM_MODEL: "m", ANTHROPIC_API_KEY: "a" });
    const c = aiConfig(); expect(c.extract?.provider).toBe("openai_compat"); expect(c.vision?.provider).toBe("anthropic");
  });
  it("transcription auto-hébergée sans clé", () => { Object.assign(process.env, { STT_BASE_URL: "http://whisper:8000/v1", STT_MODEL: "small" }); expect(aiConfig().stt).toEqual({ baseUrl: "http://whisper:8000/v1", key: "", model: "small" }); });
  it("compatibilité des anciennes variables OpenAI", () => { Object.assign(process.env, { OPENAI_API_KEY: "k", OPENAI_STT_MODEL: "w" }); expect(aiConfig().stt).toEqual({ baseUrl: "https://api.openai.com/v1", key: "k", model: "w" }); });
});

describe("appels (réponses simulées)", () => {
  it("Anthropic : outil forcé", async () => {
    process.env.ANTHROPIC_API_KEY = "a";
    const f = vi.fn(async () => json({ content: [{ type: "tool_use", input: { first_name: "Dan" } }] })); vi.stubGlobal("fetch", f);
    expect(await llmExtract("contact", { text: "Dan veut acheter" })).toEqual({ first_name: "Dan" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]; expect(url).toBe("https://api.anthropic.com/v1/messages"); expect(JSON.parse(String(init.body)).tool_choice.name).toBe("record_fields");
  });
  it("compatible OpenAI : mode JSON, jeton Bearer, JSON entouré de ``` accepté", async () => {
    Object.assign(process.env, { LLM_PROVIDER: "openai_compat", LLM_BASE_URL: "https://api.deepseek.com", LLM_API_KEY: "sk-x", LLM_MODEL: "deepseek-chat" });
    const f = vi.fn(async () => json({ choices: [{ message: { content: "```json\n{\"first_name\":\"Dan\"}\n```" } }] })); vi.stubGlobal("fetch", f);
    expect(await llmExtract("contact", { text: "Dan" })).toEqual({ first_name: "Dan" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]; const body = JSON.parse(String(init.body));
    expect(url).toBe("https://api.deepseek.com/chat/completions"); expect((init.headers as Record<string, string>).authorization).toBe("Bearer sk-x");
    expect(body.response_format).toEqual({ type: "json_object" }); expect(body.messages[0].content).toContain("JSON");
  });
  it("sortie non JSON → erreur claire (pas de champ inventé)", async () => {
    Object.assign(process.env, { LLM_PROVIDER: "openai_compat", LLM_BASE_URL: "https://x", LLM_MODEL: "m" });
    vi.stubGlobal("fetch", vi.fn(async () => json({ choices: [{ message: { content: "Désolé, je ne peux pas" } }] })));
    await expect(llmExtract("contact", { text: "x" })).rejects.toThrow("llm_no_output");
  });
  it("traduction via compatible OpenAI", async () => {
    Object.assign(process.env, { LLM_PROVIDER: "openai_compat", LLM_BASE_URL: "https://x", LLM_MODEL: "m" });
    vi.stubGlobal("fetch", vi.fn(async () => json({ choices: [{ message: { content: "{\"translation\":\"3-room apartment, 3,170,000 NIS\"}" } }] })));
    expect(await llmTranslate("Appartement 3 pièces, 3 170 000 NIS", "fr", "en")).toContain("3,170,000");
  });
  it("transcription : URL configurable, sans en-tête d'autorisation si pas de clé", async () => {
    Object.assign(process.env, { STT_BASE_URL: "http://whisper:8000/v1", STT_MODEL: "small" });
    const f = vi.fn(async () => json({ text: " bonjour ", language: "fr" })); vi.stubGlobal("fetch", f);
    expect(await transcribe(Buffer.from("x"), "audio/webm", "fr")).toEqual({ text: "bonjour", language: "fr" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]; expect(url).toBe("http://whisper:8000/v1/audio/transcriptions"); expect(init.headers).toEqual({});
  });
});
