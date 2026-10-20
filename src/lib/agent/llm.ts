/**
 * Minimal typed wrapper over the Gemini generateContent endpoint. Squad Night
 * uses it in JSON mode for the two agent steps that need language: narrating
 * the Qloo-grounded verdict, and producing the "generic assistant"
 * counterfactual for the same squad.
 *
 * Server-only: the API key never leaves the server process.
 */

const DEFAULT_MODEL = "gemini-3.8-flash";
const ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta";

export class LlmError extends Error {
  readonly status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "LlmError";
    this.status = status;
  }
}

/** Transient upstream states worth one more try with backoff. */
const RETRYABLE = new Set([429, 500, 503, 504]);
/** Backoff waits between attempts: ~1.4s, then ~4s. Keeps worst case < maxDuration. */
const BACKOFF_MS = [1_400, 4_000];

/** Request one JSON object from the model. Throws LlmError on any failure. */
export const generateJson = async <T>(system: string, user: string): Promise<T> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LlmError("GEMINI_API_KEY is not configured.", 500);
  const endpoint = `${ENDPOINT_BASE}/models/${process.env.GEMINI_MODEL ?? DEFAULT_MODEL}:generateContent`;

  const requestOnce = async (): Promise<T> => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 1 },
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new LlmError(`Gemini request failed ${response.status}: ${detail.slice(0, 240)}`);
    }

    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new LlmError("Gemini returned no text candidates.");
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new LlmError("Gemini returned malformed JSON narration.");
    }
  };

  // Gemini 503 "high demand" spikes are transient but frequent; retry the
  // request body as-is. Only transport-level failures grant a retry — a
  // malformed response is a prompt bug, not load. The deadline keeps the
  // whole retry ladder inside the route's maxDuration budget.
  const started = Date.now();
  let attempt = 0;
  for (;;) {
    try {
      return await requestOnce();
    } catch (error) {
      const message = error instanceof LlmError ? error.message : "";
      const status = Number(message.match(/failed (\d{3})/)?.[1]);
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      const retryable = RETRYABLE.has(status) || timedOut;
      if (retryable && attempt < BACKOFF_MS.length && Date.now() - started < 50_000) {
        await new Promise((resolve) => setTimeout(resolve, BACKOFF_MS[attempt]));
        attempt += 1;
        continue;
      }
      throw error;
    }
  }
};
