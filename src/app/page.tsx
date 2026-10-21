import Link from "next/link";

/**
 * Landing: one screen establishes the promise and shows a real verdict
 * artifact (actual Qloo numbers from a live negotiation), then routes
 * judges into the squad room. First thirty seconds land here.
 */

const phases = [
  {
    when: "Before you meet",
    body: "Two to five friends name three favorites each. Free text is fine: a film, a record, whatever is honest.",
  },
  {
    when: "While you argue",
    body: "Every favorite grounds onto Qloo's cultural graph. Candidates rank by the squad's joint affinity, with films and tables compared on one scale.",
  },
  {
    when: "The reveal",
    body: "One film, one table. The losing options and their scores sit right below the winners, and so does what a taste-less assistant would have said.",
  },
];

/** The artifact judges see first: real numbers from a live Lagos negotiation. */
const PreviewCard = () => (
  <div className="poster card overflow-hidden p-0 md:rotate-[0.4deg]">
    <p className="num border-b border-line px-6 py-3.5 text-[0.7rem] text-muted">
      verdict · Ayo &amp; Ada, Lagos · two friends, six favorites
    </p>
    <div className="space-y-5 px-6 py-6">
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-lg font-semibold text-ink">Whiplash</span>
          <span className="num text-lg font-bold text-accent">88%</span>
        </div>
        <div className="meter mt-2.5" style={{ ["--value" as string]: 0.88 }} />
        <p className="mt-2 text-xs text-muted">film · Qloo joint affinity across the squad</p>
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-display text-lg font-semibold text-ink">Crescendo Lounge And Bar</span>
          <span className="num text-lg font-bold text-accent">85%</span>
        </div>
        <div className="meter mt-2.5" style={{ ["--value" as string]: 0.85 }} />
        <p className="mt-2 text-xs text-muted">table · grounded in Lagos, not popularity</p>
      </div>
      <div className="border-t border-line pt-4">
        <p className="num text-xs leading-relaxed text-muted">
          lost: Knives Out (0.71) — the transcript keeps
          <br />
          every number, including the losers.
        </p>
      </div>
    </div>
  </div>
);

export default function Home() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-ink">
            Squad Night
          </span>
        </div>
        <p className="text-xs text-muted">Qloo Agentic Hackathon, October 2026</p>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="relative grid grid-cols-[minmax(0,1fr)] gap-14 overflow-hidden pb-20 pt-16 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-center md:pb-28 md:pt-24">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-0 hidden h-[560px] w-[720px] md:block"
            style={{
              background:
                "radial-gradient(640px 340px at 28% 30%, rgba(240,163,92,0.15), transparent 70%)",
            }}
          />
          <div className="reveal-item relative">
            <h1 className="max-w-full font-display text-[clamp(2.25rem,6.4vw,5.6rem)] font-semibold leading-[0.99] tracking-[-0.025em] text-ink md:max-w-[19ch]">
              The night-out plan your group chat keeps
              <span className="font-display italic font-medium text-accent"> arguing about</span>, settled.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
              Each friend names what they honestly love. Squad Night reads those names against
              Qloo&apos;s cultural graph, a quarter of a million entities deep, then negotiates one
              film and one table the whole squad is glad to show up for. Losing options keep their
              scores on screen; nothing is smoothed over.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/night"
                className="rounded-xl bg-accent px-8 py-4 font-semibold text-[#231204] transition-colors hover:bg-accent-deep hover:text-[#ffe9d1]"
              >
                Start a squad
              </Link>
              <a
                href="#how"
                className="text-muted transition-colors hover:text-ink underline-offset-4 hover:underline"
              >
                See how it negotiates
              </a>
            </div>
            <p className="num mt-7 text-xs text-muted">
              live, no account, no app to install · keys stay on the server
            </p>
          </div>
          <div className="reveal-item relative" style={{ ["--step" as string]: 2 }}>
            <PreviewCard />
          </div>
        </section>

        <section id="how" className="pb-24">
          <div className="divide-y divide-line border-y border-line">
            {phases.map((phase, index) => (
              <div key={phase.when} className="grid gap-2 py-8 md:grid-cols-[120px_minmax(0,1fr)] md:gap-10">
                <div className="font-display text-2xl italic font-medium text-accent">
                  {String(index + 1).padStart(2, "0")}.
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-ink">{phase.when}</h2>
                  <p className="mt-2 max-w-2xl leading-relaxed text-muted">{phase.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-10">
        <p className="mx-auto max-w-6xl px-6 num text-xs leading-relaxed text-muted">
          Qloo describes what people tend to love; it does not claim to know any one person.
          Affinity numbers on screen are Qloo&apos;s own, passed through verbatim.
        </p>
      </footer>
    </div>
  );
}
