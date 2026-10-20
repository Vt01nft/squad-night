import Link from "next/link";

/**
 * Landing: establishes the promise in one screen and routes judges straight
 * into the live squad room. The first thirty seconds have to land here.
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

export default function Home() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 pt-8">
        <div className="flex items-center gap-2.5">
          <div className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="font-mono text-sm font-semibold tracking-[0.2em] uppercase text-ink">
            Squad Night
          </span>
        </div>
        <p className="text-xs text-muted">Qloo Agentic Hackathon, October 2026</p>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="pt-24 pb-16 md:pt-36 md:pb-24">
          <h1 className="max-w-4xl font-display text-[clamp(2.75rem,7vw,5.5rem)] font-semibold leading-[1.02] tracking-[-0.02em] text-ink">
            The night-out plan
            <br />
            your group chat keeps
            <span className="font-display italic font-medium"> arguing about</span>, settled.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted">
            Each friend names what they honestly love. Squad Night reads those names against
            Qloo&apos;s cultural graph, a quarter of a million entities deep, then negotiates one
            film and one table the whole squad is glad to show up for. Losing options keep their
            scores on screen; nothing is smoothed over.
          </p>
          <div className="mt-11 flex flex-wrap items-center gap-4">
            <Link
              href="/night"
              className="rounded-xl bg-accent px-8 py-4 font-semibold text-[#1d1207] transition-colors hover:bg-accent-deep hover:text-[#ffe6cc]"
            >
              Start a squad
            </Link>
            <a href="#how" className="text-muted transition-colors hover:text-ink underline-offset-4 hover:underline">
              See how it negotiates
            </a>
          </div>
          <p className="mt-7 font-mono text-xs text-muted">
            Live, no account, no app to install. Keys stay on the server.
          </p>
        </section>

        <section id="how" className="pb-24">
          <div className="divide-y divide-line border-y border-line">
            {phases.map((phase, index) => (
              <div key={phase.when} className="grid gap-2 py-8 md:grid-cols-[130px_1fr] md:gap-10">
                <div className="num text-xs uppercase tracking-[0.16em] text-accent">
                  {String(index + 1).padStart(2, "0")}
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
        <p className="mx-auto max-w-5xl px-6 font-mono text-xs leading-relaxed text-muted">
          Qloo describes what people tend to love; it does not claim to know any one person.
          Affinity numbers on screen are Qloo&apos;s own, passed through verbatim.
        </p>
      </footer>
    </div>
  );
}
