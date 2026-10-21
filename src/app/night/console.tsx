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
  "Negotiating the final pick â€” some prices you did not pay",
];

/** Counts up an affinity number on arrival; static under reduced motion. */
const useCountUp = (target: number, ms = 900): number => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      setValue(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
};

const Pct = ({ affinity }: { affinity: number }) => (
  <span className="num text-xl font-bold text-accent">{Math.round(useCountUp(affinity) * 100)}%</span>
);

const Meter = ({ affinity }: { affinity: number }) => (
  <div className="meter mt-2.5" style={{ ["--value" as string]: affinity }} />
);

const EmptyPick = ({ heading }: { heading: string }) => (
  <div className="card p-6">
    <p className="num text-xs text-muted">{heading}</p>
    <p className="mt-2 font-display text-lg text-muted">No candidate backed by enough squad signal.</p>
    <p className="mt-3 text-sm text-muted">Naming more specific favorites usually fixes this.</p>
  </div>
);

const PickCard = ({ pick, heading, step }: { pick: PickWithEvidence; heading: string; step: number }) => (
  <div className="poster card overflow-hidden p-0 reveal-item" style={{ ["--step" as string]: step }}>
    {pick.imageUrl && (
      // Qloo poster URLs are dynamic per entity; next/image would need an
      // allowlist domain per site. Direct img keeps the people's flow open.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={pick.imageUrl} alt="" className="h-44 w-full object-cover opacity-90" />
    )}
    <div className="p-6">
      <p className="num text-xs text-muted">{heading}</p>
      <p className="mt-1.5 font-display text-[1.35rem] font-semibold leading-snug tracking-[-0.01em] text-ink">
        {pick.title}
      </p>
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <span className="text-xs text-muted">Qloo affinity</span>
        <Pct affinity={pick.affinity} />
      </div>
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
    <div className="mx-auto max-w-2xl px-6 pt-24">
      <p className="num text-xs text-muted">reading the taste graphâ€¦</p>
      <ol className="mt-5 space-y-4 font-mono text-sm">
        {AGENT_STEPS.map((step, index) => (
          <li
            key={step}
            className={index < stepIndex ? "text-muted line-through" : index === stepIndex ? "text-accent" : "text-muted/30"}
          >
            {index < stepIndex ? "âœ“ " : index === stepIndex ? "â–¸ " : "  "}
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

  const hasBoth = Boolean(result.movie && result.restaurant);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 pt-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-ink">
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
        {hasBoth && (
          <h1 className="reveal-item max-w-3xl font-display text-[clamp(1.9rem,4.4vw,3.2rem)] font-medium leading-[1.12] tracking-[-0.02em] text-ink">
            {result.headline}
          </h1>
        )}
        <p className="reveal-item mt-5 max-w-xl text-lg leading-relaxed text-muted" style={{ ["--step" as string]: 1 }}>
          {result.squadVibe}
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {result.movie ? (
            <PickCard pick={result.movie} heading="tonight's film" step={2} />
          ) : (
            <EmptyPick heading="tonight's film" />
          )}
          {result.restaurant ? (
            <PickCard pick={result.restaurant} heading="tonight's table" step={3} />
          ) : (
            <EmptyPick heading="tonight's table" />
          )}
        </div>

        {(result.whyMovie || result.whyFood) && (
          <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {result.whyMovie && (
              <div className="card reveal-item p-6" style={{ ["--step" as string]: 4 }}>
                <p className="num text-xs text-muted">why this film</p>
                <p className="mt-3 text-sm leading-relaxed text-ink/95">{result.whyMovie}</p>
              </div>
            )}
            {result.whyFood && (
              <div className="card reveal-item p-6" style={{ ["--step" as string]: 4 }}>
                <p className="num text-xs text-muted">why this table</p>
                <p className="mt-3 text-sm leading-relaxed text-ink/95">{result.whyFood}</p>
              </div>
            )}
          </div>
        )}

        {result.negotiation.length > 0 && (
          <div className="card reveal-item mt-6 p-6" style={{ ["--step" as string]: 5 }}>
            <p className="font-display text-lg font-semibold text-ink">What lost, and by how much</p>
            <ul className="mt-4 space-y-3">
              {result.negotiation.map((line, index) => (
                <li key={index} className="flex gap-3 text-sm leading-relaxed text-ink/95">
                  <span className="text-accent-deep">âœ•</span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* The Counterfactual: same model, same squad inputs, one variable â€”
            whether Qloo's taste data is allowed in the room. */}
        <div className="reveal-item card mt-6 overflow-hidden p-0" style={{ ["--step" as string]: 6 }}>
          <p className="num border-b border-line bg-surface-2 px-6 py-3.5 text-xs text-muted">
            the same assistant, with and without Qloo&apos;s graph
          </p>
          <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="border-b border-line p-6 md:border-b-0 md:border-r">
              <p className="num text-xs text-muted">without Qloo</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {result.counterfactual.movie}
                <br />
                {result.counterfactual.restaurant}
              </p>
              <p className="num mt-3 text-xs text-muted/70">{result.counterfactual.note}</p>
            </div>
            <div className="p-6" style={{ background: "var(--accent-soft)" }}>
              <p className="num text-xs font-semibold text-accent">with Qloo</p>
              <p className="mt-3 text-sm leading-relaxed text-ink">
                {result.movie ? `${result.movie.title} â€” ${Math.round(result.movie.affinity * 100)}% affinity` : "no backed candidate"}
                <br />
                {result.restaurant
                  ? `${result.restaurant.title} â€” ${Math.round(result.restaurant.affinity * 100)}% affinity`
                  : "no backed candidate"}
              </p>
            </div>
          </div>
        </div>

        <div className="card reveal-item mt-6 p-6" style={{ ["--step" as string]: 7 }}>
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
                      {entry.input} <span className="text-accent">â†’</span> {entry.matchedAs}
                    </span>
                  ))}
                  {report.notFound.map((input) => (
                    <span
                      key={input}
                      className="rounded-md border border-line px-2.5 py-1 text-xs text-muted/50 line-through"
                    >
                      {input} â€” unresolved
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {result.meta.deadSignalMembers.length > 0 && (
            <p className="num mt-4 text-xs text-muted">
              No resolvable favorites from {result.meta.deadSignalMembers.join(" or ")}: their picks
              carried no signal into the ranking.
            </p>
          )}
        </div>

        <div className="mt-12 flex items-center justify-between">
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
