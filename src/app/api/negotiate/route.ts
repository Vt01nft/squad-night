import { NextResponse } from "next/server";
import { NegotiateError, runNegotiation, type NegotiateRequest } from "@/lib/agent/pipeline";
import { LlmError } from "@/lib/agent/llm";

/**
 * Server-only negotiation endpoint. All Qloo and Gemini traffic happens
 * here; keys never reach the browser. Returns the full evidence-bearing
 * result, or a localized, actionable error.
 */

export const maxDuration = 60;

export async function POST(request: Request) {
  let body: NegotiateRequest;
  try {
    body = (await request.json()) as NegotiateRequest;
  } catch {
    return NextResponse.json({ error: "Send a JSON body with { members, city? }." }, { status: 400 });
  }

  try {
    const result = await runNegotiation(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NegotiateError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof LlmError && error.status === 422) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    // Unknown failure: report visibly, never fake a result.
    console.error("[negotiate] failed:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "The negotiation hit an unexpected snag. Try again in a moment." },
      { status: 500 },
    );
  }
}
