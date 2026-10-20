/**
 * Minimal typed wrapper over the Gemini generateContent endpoint. Squad Night
 * uses it in JSON mode for the two agent steps that need language: narrating
 * the Qloo-grounded verdict, and producing the "generic assistant"
 * counterfactual for the same squad.
 *
 * Server-only: the API key never leaves the server process.
 */

const DEFAULT_MODEL = "gemini-3.8-flash";
/** Ordered fallbacks when the primary flash model is saturated or hanging. */
const FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-2.5-flash"];
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
/** Backoff waits between attempts of the same model. */
const BACKOFF_MS = [1_400, 4_000];
/** Per-attempt cap; flash JSON answers typically land well under this. */
const ATTEMPT_TIMEOUT_MS = 12_000;
/** Global ladder budget; keeps every path inside the route's maxDuration. */
const DEADLINE_MS = 50_000;

/** Request one JSON object from the model. Throws LlmError on any failure. */
export const generateJson = async <T>(system: string, user: string): Promise<T> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LlmError("GEMINI_API_KEY is not configured.", 500);

  const primary = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const ladder = [primary, ...FALLBACK_MODELS.filter((model) => model !== primary)];

  const requestOnce = async (model: string): Promise<T> => {
    const response = await fetch(`${ENDPOINT_BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 1 },
      }),
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
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

  // Gemini load spikes are transient but frequent: retry the request body
  // as-is, then fall through the model ladder. Only transport-level
  // failures grant a retry — a malformed response is a prompt bug, not
  // load. The deadline keeps the ladder inside maxDuration.
  const started = Date.now();
  const retryable = (error: unknown): boolean => {
    if (error instanceof Error && error.name === "TimeoutError") return true;
    if (!(error instanceof LlmError)) return false;
    return RETRYABLE.has(Number(error.message.match(/failed (\d{3})/)?.[1]));
  };
  for (const model of ladder) {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await requestOnce(model);
      } catch (error) {
        const backoffMs = BACKOFF_MS[attempt];
        if (
          !retryable(error) ||
          backoffMs === undefined ||
          Date.now() - started + backoffMs + ATTEMPT_TIMEOUT_MS > DEADLINE_MS
        ) {
          break; // escalate to the next model, or fail below if this was the last
        }
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }
  throw new LlmError(
    "Every Gemini model was unavailable after retries. Try again in a minute.",
  );
};
