import Link from "next/link";

/**
 * Landing: establishes the promise in one screen and routes judges straight
 * into the live squad room — the first thirty seconds have to land here.
 */

const steps = [
  {
    n: "01",
    title: "Gather the squad",
    body: "Two to five friends, three favorites each — a film, an artist, a dish, anything. Free text, 20 seconds, no login.",
  },
  {
    n: "02",
    title: "Qloo does the seeing",
    body: "Every favorite lands on Qloo's 250M-entity taste graph, and the agent ranks tonight's candidates by your squad's joint cultural fingerprint.",
  },
  {
    n: "03",
    title: "One confident answer",
    body: "A movie and a dinner spot — with each pick's affinity score, why the runners-up fell, and what a taste-less AI would have told you instead.",
  },
];

export default function Home() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-mono text-sm font-semibold tracking-[0.2em] uppercase">Squad Night</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="rounded-full px-3 py-1.5 text-xs text-muted border border-line">
            Qloo Agentic Hackathon · Oct 2026
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="pt-24 pb-16 md:pt-32 md:pb-24">
          <span className="eyebrow mb-6">A taste-grounded negotiator</span>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-ink md:text-7xl md:leading-[1.05]">
            Dinner and a movie,
            <br />
            <span className="text-muted">without the</span> <span className="text-accent">war.</span>
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
            Every squad knows it: five people, six opinions, one exhausted group chat. Squad Night
            negotiates one film and one table everyone&apos;s taste actually agrees on — computed on
            Qloo&apos;s cultural taste graph, with the receipts on show.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/night"
              className="rounded-xl bg-accent px-7 py-4 font-semibold text-[#17110c] transition-colors hover:bg-accent-deep hover:text-ink"
            >
              Start a squad →
            </Link>
            <a
              href="#how"
              className="rounded-xl border border-line px-7 py-4 text-muted transition-colors hover:text-ink"
            >
              How it works
            </a>
          </div>
          <p className="mt-6 font-mono text-xs text-muted/70">
            Live demo · no signup · everything runs on real Qloo affinity data
          </p>
        </section>

        <section id="how" className="grid gap-4 pb-24 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.n} className="card p-7">
              <div className="font-mono text-xs text-accent">{step.n}</div>
              <h2 className="mt-3 text-lg font-semibold text-ink">{step.title}</h2>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{step.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-line py-10">
        <div className="mx-auto max-w-5xl px-6 text-sm text-muted">
          Built on Qloo&apos;s Insights API · agent keys stay server-side ·{" "}
          <span className="text-muted/60">Qloo describes what groups tend to love — not any one person.</span>
        </div>
      </footer>
    </div>
  );
}
