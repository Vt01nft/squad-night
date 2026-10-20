# Squad Night — 90-Second Judge Walkthrough

The judges USE the app. No video. You talk, they type. Laptop on the table, phone out if you want
to copy the squad link into a group chat while they watch.

Before you start: open the hosted app's landing page in one tab, and the fallback squad in a second
tab (see "Fallback squad" below). Close everything else.

---

## The 90 seconds

**0:00 — Hook (say it, then click "Start a squad →")**

"The group chat is where plans go to die. Five people, six opinions, nobody picks the movie or the
restaurant. Squad Night settles it — on Qloo's taste graph, with the math on screen. And you're going
to build it yourselves, right now."

**0:15 — Build a squad with the judges themselves**

Hand the laptop over with the member card facing them:

"Your name, and three things you love. A film, an artist, a dish. Messy is fine — type whatever."

- First judge: name + three favorites. Take 15 seconds.
- Second judge: same. If the room stalls, say: "Who else is opinionated tonight?" and hand the
  laptop again.
- You type your own card last (know your three picks by heart — type them fast).

Then point at the city field: "Lagos, since we're here." Type it.

Resist explaining the architecture here. The button matters more.

**0:40 — Click "Resolve the night →"**

While the agent steps run (about six seconds):

"Every favorite just landed on Qloo's graph — 250 million entities, cross-category. So your friend's
one playlist and one fein taste actually pull against mine, not hand-waved."

**0:50 — Reveal. Scroll slowly, one panel at a time:**

1. Headline + film and table cards: "One movie, one table — and Qloo's own affinity score on both."
2. Why-this-film / why-this-table: "It explains itself, from the taste data, not vibes."
3. Negotiation transcript: "Here's what lost, and by how much. The ✕ lines carry the affinity
   numbers of everything it argued down."
4. Counterfactual panel — slow down here: "Same squad, same language model, Qloo switched off.
   See what it says then. That's the whole thesis in one box."
5. Provenance panel: "And everything you typed — here's the exact Qloo entity it grounded to.
   If it couldn't ground your pick, it says so instead of faking it."

**1:20 — Outro**

"No signup, no app store. Your taste goes in as messy text, the verdict comes out with receipts.
The squad stays just a link. That's Squad Night."

(Ninety seconds is tight — cut panel 3 if you're running long, never panel 4.)

---

## Fallback squad

If judges hesitate for more than four seconds, don't wait — build it yourself. This is pre-loaded in
your second tab:

```
/night?p=eyJ2IjoxLCJtZW1iZXJzIjpbeyJuYW1lIjoiQXlvIiwicGlja3MiOlsiSW5jZXB0aW9uIiwiU1pBIiwic3V5YSJdfSx7Im5hbWUiOiJBZGEiLCJwaWNrcyI6WyJDaGluYXRvd24iLCJCdXJuYSBCb3kiLCJiZWVmIHNhbW9zYSJdfV0sImNpdHkiOiJMYWdvcyJ9
```

Flow: switch to the tab → Ayo (Inception, SZA, suya) and Ada (Chinatown, Burna Boy, beef samosa) are
already filled, city Lagos → click "Resolve the night →". Script continues at 0:40 untouched.

Line for the pivot: "While you think — here's a squad that's already in the chat: me and Ada."
Then invite a judge to add themselves as a third member before hitting resolve.

You can rebuild this by hand in 20 seconds if the URL is lost: Ayo — Inception / SZA / suya.
Ada — Chinatown / Burna Boy / beef samosa. City: Lagos.

---

## Judge questions

**"What does Qloo give you that the LLM doesn't?"**

"Cross-category affinity between real entities — film tastes pulling restaurants, artists pulling
films. An LLM has opinions about culture; it has no measurement of it. Don't take my word: that
counterfactual panel is the same model, same squad, no Qloo — and it reverts to generic blockbusters
and safe food, because with no taste data it guesses the mean."

**"Is this personalized or just group-hallucinated?"**

"It's a real aggregate. Every pick is grounded to a Qloo entity, and the scores come from affinity
computed across the squad's resolved entities. And the UI says it honestly: Qloo describes what
groups tend to love, not what any individual does. That disclaimer is on the landing footer — we
disclose rather than overclaim."

**"How do I know the affinity number is real?"**

"It's Qloo's own number. The pipeline calls Qloo's insights API, and the percentage you see is the
affinity score Qloo returned — rendered to the screen, not tweaked. The provenance panel below shows
every input you typed mapped to the exact entity it became, so you can audit each grounding yourself.
Unresolved picks get struck through, not silently rewritten."

---

## Failure playbook

- **The app is hosted; prefer retry over offline tricks.** If /api/negotiate errors on conference
  Wi-Fi, stay calm: click "← Back to the squad" and run it again. Most conference drops last one
  attempt.
- **If it fails twice:** switch to the fallback-squad tab and try there — it may be a fluke around
  a slow first call.
- **If it fails three times or stalls on the loading steps:** say this while you wait —

  "Wi-Fi is fighting us, but the verdict data doesn't lie — let me show you what it produced."

  and narrate the verdict page from a run you did before the session. Run one live result right
  before judging starts and keep that browser tab open. Kill tabs between then and your slot.
- **If completely offline:** open localhost from your pre-run. The voice of the demo is the verdict
  page, not the network round-trip; the loading animation buys you time either way.
- Never debug tooling live. One retry, then pivot. A confident pivot reads as a demo; silence reads
  as failure.

---

## Rubric mapping

- **Technological implementation** — the provenance panel (typed favorite → resolved Qloo entity,
  unresolved struck through) plus the live Qloo affinity percentages rendered verbatim on the film
  and table cards.
- **Design** — the /night/result flow: animated agent steps, verdict headline, cards, transcript,
  counterfactual, provenance, in that scroll order. One screen, one argument, no signup anywhere.
- **Quality of idea** — the counterfactual panel: same squad, same LLM, Qloo switched on and off.
  The judged difference is visible without any explanation.
- **Potential impact** — zero-signup group flow: favorites as free text, the squad is just a URL,
  the link alone carries the plan into any group chat.
