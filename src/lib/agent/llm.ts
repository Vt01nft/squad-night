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

/** Request one JSON object from the model. Throws LlmError on any failure. */
export const generateJson = async <T>(system: string, user: string): Promise<T> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LlmError("GEMINI_API_KEY is not configured.", 500);

  const response = await fetch(
    `${ENDPOINT_BASE}/models/${process.env.GEMINI_MODEL ?? DEFAULT_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 1 },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

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
