"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { decodeSquad } from "@/lib/squad/codec";
import type { NegotiateResult, PickWithEvidence } from "@/lib/agent/pipeline";

/**
 * The verdict view. Three jobs, in order of what a judge sees first: the
 * confident answer, the negotiation transcript (evidence), and the
 * counterfactual that shows what the same model says without Qloo. One
 * staged reveal on arrival; reduced-motion users skip straight to content.
 */

const AGENT_STEPS = [
  "Resolving the squad onto the Qloo taste graph",
  "Gathering cross-category affinity data",
  "Weighing tonight's candidates jointly",
  "Negotiating the final pick — some prices you did not pay",
];

const pct = (affinity: number): string => `${Math.round(affinity * 100)}%`;

const Meter = ({ affinity }: { affinity: number }) => (
  <div className="mt-5">
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-muted">Qloo affinity</span>
      <span className="num text-lg font-bold text-accent">{pct(affinity)}</span>
    </div>
    <div className="meter mt-2.5" style={{ ["--value" as string]: affinity }} />
  </div>
);

const EmptyPick = ({ heading }: { heading: string }) => (
  <div className="card p-6">
    <p className="text-xs text-muted">{heading}</p>
    <p className="mt-2 font-display text-lg text-muted">No candidate backed by enough squad signal.</p>
    <p className="mt-3 text-sm text-muted">Naming more specific favorites usually fixes this.</p>
  </div>
);

const PickCard = ({ pick, heading }: { pick: PickWithEvidence; heading: string }) => (
  <div className="card overflow-hidden">
    {pick.imageUrl && (
      // Qloo poster URLs are dynamic per entity; next/image would need an
      // allowlist domain per site. Direct img keeps the people's flow open.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={pick.imageUrl} alt="" className="h-40 w-full object-cover opacity-85" />
    )}
    <div className="p-6">
      <p className="text-xs text-muted">{heading}</p>
      <p className="mt-1.5 font-display text-2xl font-semibold tracking-[-0.01em] text-ink">{pick.title}</p>
      <Meter affinity={pick.affinity} />
    </div>
  </div>
);

const LoadingSteps = () => {
  const [stepIndex, setStepIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStepIndex((index) => Math.min(index + 1, AGENT_STEPS.length - 1)), 1600);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="mx-auto max-w-2xl pt-24">
      <ol className="space-y-4 font-mono text-sm">
        {AGENT_STEPS.map((step, index) => (
          <li
            key={step}
            className={index < stepIndex ? "text-muted line-through" : index === stepIndex ? "text-accent" : "text-muted/30"}
          >
            {index < stepIndex ? "✓ " : index === stepIndex ? "▸ " : "  "}
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
};

export function NegotiationConsole() {
  const searchParams = useSearchParams();
  const squad = decodeSquad(searchParams.get("p"));
  const [result, setResult] = useState<NegotiateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!squad || requestedRef.current) return;
    requestedRef.current = true;
    const run = async () => {
      try {
        const response = await fetch("/api/negotiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ members: squad.members, city: squad.city }),
        });
        const json = (await response.json()) as NegotiateResult | { error: string };
        if (!response.ok || "error" in json) {
          setError("error" in json ? json.error : "Something went wrong.");
        } else {
          setResult(json);
        }
      } catch {
        setError("Could not reach the negotiator. Check the connection and try again.");
      }
    };
    void run();
  }, [squad]);

  if (!squad) {
    return (
      <div className="min-h-dvh px-6 pt-32 text-center">
        <p className="text-muted">This squad link is empty or malformed.</p>
        <Link href="/night" className="mt-4 inline-block text-accent hover:underline">
          Start a squad
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh px-6 pt-24">
        <div className="card mx-auto max-w-xl p-8">
          <p className="font-display text-xl font-semibold text-ink">The negotiation stopped</p>
          <p className="mt-3 leading-relaxed text-muted">{error}</p>
          <Link href="/night" className="mt-5 inline-block text-sm text-accent hover:underline">
            Back to the squad room
          </Link>
        </div>
      </div>
    );
  }

  if (!result) return <LoadingSteps />;

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 pt-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-mono text-sm font-semibold tracking-[0.2em] uppercase text-ink">
            Squad Night
          </span>
        </Link>
        <span className="num text-right text-[0.68rem] leading-relaxed text-muted">
          {result.meta.groundedFavorites} grounded favorites,
          <br />
          {result.meta.qlooCalls} Qloo calls, {(result.meta.durationMs / 1000).toFixed(1)}s
        </span>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-28 pt-12">
        {result.movie && result.restaurant && (
          <h1 className="reveal-item max-w-3xl font-display text-3xl font-medium leading-tight tracking-[-0.015em] text-ink md:text-5xl">
            {result.headline}
          </h1>
        )}
        <p className="reveal-item mt-4 max-w-xl text-lg text-muted" style={{ ["--step" as string]: 1 }}>
          {result.squadVibe}
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {result.movie ? (
            <PickCard pick={result.movie} heading="Tonight's film" />
          ) : (
            <EmptyPick heading="Tonight's film" />
          )}
          {result.restaurant ? (
            <PickCard pick={result.restaurant} heading="Tonight's table" />
          ) : (
            <EmptyPick heading="Tonight's table" />
          )}
        </div>

        {(result.whyMovie || result.whyFood) && (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {result.whyMovie && (
              <div className="card p-6">
                <p className="text-xs text-muted">Why this film</p>
                <p className="mt-3 text-sm leading-relaxed text-ink/95">{result.whyMovie}</p>
              </div>
            )}
            {result.whyFood && (
              <div className="card p-6">
                <p className="text-xs text-muted">Why this table</p>
                <p className="mt-3 text-sm leading-relaxed text-ink/95">{result.whyFood}</p>
              </div>
            )}
          </div>
        )}

        {result.negotiation.length > 0 && (
          <div className="card mt-5 p-6">
            <p className="font-display text-lg font-semibold text-ink">What lost, and by how much</p>
            <ul className="mt-4 space-y-3">
              {result.negotiation.map((line, index) => (
                <li key={index} className="flex gap-3 text-sm leading-relaxed text-ink/95">
                  <span className="text-accent-deep">✕</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* The Counterfactual: same model, same squad inputs, one variable —
            whether Qloo's taste data is allowed in the room. */}
        <div className="card mt-5 overflow-hidden p-0">
          <p className="border-b border-line bg-surface-2 px-6 py-4 text-xs text-muted">
            The same assistant, with and without Qloo&apos;s graph
          </p>
          <div className="grid md:grid-cols-2">
            <div className="border-b border-line p-6 md:border-b-0 md:border-r">
              <p className="text-xs text-muted">Without Qloo</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {result.counterfactual.movie}
                <br />
                {result.counterfactual.restaurant}
              </p>
              <p className="mt-3 text-xs text-muted/70">{result.counterfactual.note}</p>
            </div>
            <div className="p-6" style={{ background: "var(--accent-soft)" }}>
              <p className="text-xs font-semibold text-accent">With Qloo</p>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                {result.movie ? `${result.movie.title} — ${pct(result.movie.affinity)} affinity` : "no backed candidate"}
                <br />
                {result.restaurant
                  ? `${result.restaurant.title} — ${pct(result.restaurant.affinity)} affinity`
                  : "no backed candidate"}
              </p>
            </div>
          </div>
        </div>

        <div className="card mt-5 p-6">
          <p className="font-display text-lg font-semibold text-ink">How the favorites grounded</p>
          <div className="mt-4 space-y-4">
            {result.grounding.map((report) => (
              <div key={report.member}>
                <p className="text-sm font-semibold text-ink">{report.member}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {report.resolved.map((entry) => (
                    <span
                      key={entry.input}
                      className="rounded-md border border-line bg-surface-2 px-2.5 py-1 text-xs text-muted"
                    >
                      {entry.input} <span className="text-accent">→</span> {entry.matchedAs}
                    </span>
                  ))}
                  {report.notFound.map((input) => (
                    <span
                      key={input}
                      className="rounded-md border border-line px-2.5 py-1 text-xs text-muted/50 line-through"
                    >
                      {input} — unresolved
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {result.meta.deadSignalMembers.length > 0 && (
            <p className="mt-4 text-xs text-muted">
              No resolvable favorites from {result.meta.deadSignalMembers.join(" or ")}: their picks
              carried no signal into the ranking.
            </p>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <Link href="/night" className="text-sm text-accent hover:underline">
            Run another squad
          </Link>
          <p className="num text-[0.68rem] text-muted">
            Qloo describes groups, not individuals. Scores are verbatim from the API.
          </p>
        </div>
      </main>
    </div>
  );
}
