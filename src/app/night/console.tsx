"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { decodeSquad } from "@/lib/squad/codec";
import type { NegotiateResult, PickWithEvidence } from "@/lib/agent/pipeline";

/**
 * The verdict view. Three jobs, in order of what a judge sees first: the
 * confident answer, the negotiation transcript (evidence), and the
 * counterfactual that shows what a taste-less assistant would have said.
 */

const AGENT_STEPS = [
  "Resolving the squad onto the Qloo taste graph…",
  "Gathering cross-category affinity data…",
  "Weighing tonight's candidates jointly…",
  "Negotiating the final pick — some prices you did not pay…",
];

const pct = (affinity: number): string => `${Math.round(affinity * 100)}%`;

const AffinityBar = ({ affinity }: { affinity: number }) => (
  <div className="mt-4">
    <div className="flex items-baseline justify-between">
      <span className="eyebrow text-[0.6rem]">Qloo affinity</span>
      <span className="font-mono text-xl font-semibold text-accent">{pct(affinity)}</span>
    </div>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-accent" style={{ width: pct(affinity) }} />
    </div>
  </div>
);

const PickCard = ({ pick, heading }: { pick: PickWithEvidence; heading: string }) => (
  <div className="card overflow-hidden">
    {pick.imageUrl && (
      // Qloo image hosts are dynamic per-entity paths; next/image adds no
      // value here.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={pick.imageUrl} alt="" className="h-36 w-full object-cover opacity-80" />
    )}
    <div className="p-6">
      <div className="text-xs font-semibold tracking-widest text-muted uppercase">{heading}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">{pick.title}</div>
      <AffinityBar affinity={pick.affinity} />
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
      <div className="space-y-4 font-mono text-sm">
        {AGENT_STEPS.map((step, index) => (
          <div
            key={step}
            className={index < stepIndex ? "text-muted line-through" : index === stepIndex ? "text-accent" : "text-muted/30"}
          >
            {index < stepIndex ? "✓ " : index === stepIndex ? "▸ " : "  "}
            {step}
          </div>
        ))}
      </div>
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
          Start a squad →
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh px-6 pt-24">
        <div className="card mx-auto max-w-xl p-8">
          <div className="text-sm font-semibold tracking-widest text-accent uppercase">Negotiation failed</div>
          <p className="mt-3 text-muted">{error}</p>
          <Link href="/night" className="mt-5 inline-block text-sm text-accent hover:underline">
            ← Back to the squad
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
          <span className="font-mono text-sm font-semibold tracking-[0.2em] uppercase text-ink">Squad Night</span>
        </Link>
        <span className="font-mono text-xs text-muted">
          {result.meta.groundedFavorites} grounded favorites · {result.meta.qlooCalls} Qloo calls ·{" "}
          {(result.meta.durationMs / 1000).toFixed(1)}s
        </span>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-28 pt-12">
        <div className="text-xs font-semibold tracking-widest text-accent uppercase">The verdict</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-5xl">{result.headline}</h1>
        <p className="mt-4 text-lg text-muted">{result.squadVibe}</p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <PickCard pick={result.movie} heading="Tonight's film" />
          <PickCard pick={result.restaurant} heading="Tonight's table" />
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="card p-6">
            <div className="text-xs font-semibold tracking-widest text-muted uppercase">Why this film</div>
            <p className="mt-3 text-sm leading-relaxed text-ink/90">{result.whyMovie}</p>
          </div>
          <div className="card p-6">
            <div className="text-xs font-semibold tracking-widest text-muted uppercase">Why this table</div>
            <p className="mt-3 text-sm leading-relaxed text-ink/90">{result.whyFood}</p>
          </div>
        </div>

        <div className="card mt-5 p-6">
          <div className="text-xs font-semibold tracking-widest text-muted uppercase">The negotiation transcript</div>
          <ul className="mt-4 space-y-3">
            {result.negotiation.map((line, index) => (
              <li key={index} className="flex gap-3 text-sm leading-relaxed text-ink/90">
                <span className="text-accent">✕</span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        {/* The Counterfactual — same squad, same model, zero taste data. */}
        <div className="card mt-5 overflow-hidden p-0">
          <div className="border-b border-line bg-surface-2 px-6 py-4">
            <span className="text-xs font-semibold tracking-widest text-muted uppercase">
              Same squad, same language model — the only difference is Qloo
            </span>
          </div>
          <div className="grid md:grid-cols-2">
            <div className="border-b border-line p-6 md:border-b-0 md:border-r">
              <div className="text-xs font-semibold tracking-widest text-muted uppercase">Without Qloo</div>
              <div className="mt-3 space-y-1.5 text-sm text-muted">
                <div>Movie: {result.counterfactual.movie}</div>
                <div>Dinner: {result.counterfactual.restaurant}</div>
                <div className="pt-2 text-muted/70 italic">{result.counterfactual.note}</div>
              </div>
            </div>
            <div className="p-6" style={{ background: "var(--accent-soft)" }}>
              <div className="text-xs font-semibold tracking-widest text-accent uppercase">With Qloo</div>
              <div className="mt-3 space-y-1.5 text-sm text-ink">
                <div>Movie: {result.movie.title} — affinity {pct(result.movie.affinity)}</div>
                <div>Table: {result.restaurant.title} — affinity {pct(result.restaurant.affinity)}</div>
                <div className="pt-2 text-muted">Both scores are Qloo&apos;s own affinity for your squad.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Grounding provenance — what Qloo matched, and what it couldn't. */}
        <div className="card mt-5 p-6">
          <div className="text-xs font-semibold tracking-widest text-muted uppercase">
            Provenance — how your favorites grounded
          </div>
          <div className="mt-4 space-y-4">
            {result.grounding.map((report) => (
              <div key={report.member}>
                <div className="text-sm font-semibold text-ink">{report.member}</div>
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
                    <span key={input} className="rounded-md border border-line px-2.5 py-1 text-xs text-muted/50 line-through">
                      {input} — unresolved
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {result.meta.deadSignalMembers.length > 0 && (
            <p className="mt-4 text-xs text-muted/70">
              No resolvable favorites from: {result.meta.deadSignalMembers.join(", ")}.
            </p>
          )}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/night"
            className="rounded-xl border border-line px-7 py-4 text-sm text-muted transition-colors hover:text-ink"
          >
            Run another squad →
          </Link>
        </div>
      </main>
    </div>
  );
}
