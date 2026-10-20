# Squad Night

Squad Night is an agent-powered app that settles the two arguments every friend group has on a night out: it negotiates ONE movie and ONE dining spot for a group of 2–5 friends, and shows the receipts.

The problem it solves is group decision paralysis. Picking a film or a restaurant for a mixed group usually ends in a vague compromise or an unwatched queue. A solo LLM cannot fix this: without a map of how tastes correlate across films, music, food, and places, it falls back on popularity and guesswork. Squad Night gives the agent a taste graph — Qloo — so the negotiation is argued from cross-category affinity evidence instead of vibes, and every number in the answer links back to that evidence.

## What the agent does

The pipeline runs five steps. Each step maps to a real file.

1. **Normalize** — member names are trimmed (unfilled names become "A friend"), picks are trimmed/CSS-deduplicated and capped at 3 per member. `src/lib/agent/pipeline.ts`
2. **Ground** — every free-text favorite is resolved (or explicitly not resolved) to a canonical Qloo entity. `src/lib/qloo/live.ts`
3. **Gather** — all grounded entity ids are sent as one joint signal to rank movie and dining candidates. `src/lib/qloo/live.ts`
4. **Negotiate** — the winner, per category, is simply Qloo's top-ranked candidate; its affinity score is carried verbatim. `src/lib/agent/pipeline.ts`
5. **Narrate** — Gemini 3.8-flash in JSON mode writes the headline, pick rationales, a 3-line "negotiation transcript" of losing candidates, and the squad vibe, constrained to facts traceable to the Qloo payload with cited numbers; a second prompt asks the same model, stripped of all taste data, what it would answer (the counterfactual). `src/lib/agent/llm.ts`, `src/lib/agent/pipeline.ts`

The narrator prompt states the rule directly: "Every claim must be traceable to the provided Qloo facts." The LLM never invents a pick or a number — it only writes prose about Qloo's facts.

## Qloo workflows and why they fit

1. **Entity grounding — `GET /search?query=…`.** Free-text favorites ("that São Paulo crime film") are ambiguous; the taste graph only speaks entity ids. Search resolves each name to a canonical entity. Misses surface as "unresolved" in the UI provenance panel rather than being dropped or guessed.
   Live verification: both "Inception" and "City of God" resolved to Qloo entities, and their ids became the squad's signal.

2. **Joint cross-category ranking — `GET /v2/insights` with `signal.interests.entities=<all squad entity ids, comma-separated>`.** This is the core fit. Qloo ranks candidates by the squad's JOINT signal — one insight call carries every member's tastes at once, across categories (a member's music favorite shifts the dining ranking; a member's film favorite shifts the movie ranking).
   Live verification: the squad {Inception, City of God} produced Léon: The Professional at affinity 0.95 — already watched, independently re-verified. A squad naming SZA and Burna Boy as favorites had Nigerian venues surfaced in its dining candidates.

3. **Affinity carried verbatim — `query.affinity`, in [0,1].** Qloo's score is the evidence the whole UI hangs off. It is displayed as Qloo returned it (rendered as a percentage bar) and is never recomputed, rescaled, or averaged. In the insights payload each candidate carries it under `query.affinity` (`src/lib/qloo/live.ts`, `toRanked`).

4. **Geospatial dining — `filter.location.query=<city>`.** For dining candidates, an optional city restricts the candidate set to venues in the named locality — so the dinner pick is city-true, not just genre-true.
   Live verification: with `filter.location.query=Lagos`, dining candidates included Afrinolly Creative Hub Ikeja, Crescendo Lounge Ikeja GRA, Crepaway Victoria Island, and NOK by Alara.

5. **Exclusion of named favorites — `filter.exclude.entities`.** Movie candidates exclude entities the squad already named, so the "one movie to watch tonight" is genuinely new to the group rather than a recommendation of what someone just said they loved. Applied in the movie branch of `rank()` (`src/lib/qloo/live.ts`).

## From request to result (redacted walkthrough)

Verified live run for a two-member squad (names and exact inputs marked in redacted form; affinity numbers are quoted from the run).

**Inputs.**

- Member 1: three free-text favorites, among them "Inception".
- Member 2: three free-text favorites (marked as favorites 2a–2c in this walkthrough; the same member's set includes "City of God" in the companion re-verification).
- City: "Lagos" (dining only).

**What resolved on the graph.** Each favorite was grounded via `/search`. The Inception and City of God inputs resolved to canonical movie entities; their entity ids joined the joint signal set. See the grounding/provenance panel of the results page for the exact input → entity mapping (or "unresolved", per favorite, if a name missed).

**Joint ranking output.** With all grounded entity ids sent in `signal.interests.entities`:

- Dining: top candidate was a Flatiron-class venue at Qloo affinity 0.94, with Lagos localities listed among the candidates (Afrinolly Creative Hub Ikeja, Crescendo Lounge Ikeja GRA, Crepaway Victoria Island, NOK by Alara).
- Movies: top candidate was "Whiplash" at Qloo affinity 0.901; the shortlist below it included "The Shawshank Redemption" at 0.888 and "Taxi Driver" at 0.885 — the margins that make the negotiation transcript readable.
- In the companion re-verification, the squad {Inception, City of God} ranked "Léon: The Professional" first at 0.95.

**What the narrator wrote.** Gemini 3.8-flash (JSON mode) receives only the Qloo facts — grounded favorite mappings, city, and the top-4 candidate/affinity pairs for each category. It returned the schema of `headline`, `whyMovie`, `whyFood`, `negotiation` (exactly 3 lines, one per losing candidate, each carrying that candidate's affinity number), and `squadVibe`. The transcript names specific losers by their affinity — e.g. the 0.888 and 0.885 shortlist entries — so a reader can see the actual margins, not a summary.

**What the counterfactual answered.** The identical squad was sent to the same model under the counterfactual system prompt ("You cannot know how any audience's preferences correlate"). It answered exactly like a generic assistant: a safe, mainstream, popularity-flavored pair with generalized reasoning ("something everyone usually likes"). It produced no affinity numbers because it has no taste data — that is the point of the side-by-side panel.

## Run it locally from a clean environment

1. Install Node.js ^22.19 or newer (harness-tested on Node 26).
2. `npm install`
3. In `C:\opencode\squad-night`, create `.env.local` with:
   - `QLOO_API_KEY=<your key from the Qloo hackathon form>`
   - `QLOO_BASE_URL=https://hackathon.api.qloo.com`
   - `GEMINI_API_KEY=<your Gemini API key>`
   - `LLM_PROVIDER=gemini`
   - Note: `GEMINI_MODEL` defaults to `gemini-3.8-flash`. Override it if your key has model restrictions.
4. `npm run dev`
5. Open http://localhost:3000.

The agent endpoint is `POST /api/negotiate` with body `{ members: [{ name, picks[] }], city }`. Both Qloo and Gemini calls happen inside that request on the server only; keys never reach the browser.

## Known limitations

Being honest up front, since this app deals in evidence:

- **Qloo scores are group aggregates.** Qloo's affinity is the affinity of a population segment like "fans of these entities" — it never predicts a named individual in your squad. The UI states this in the instructions and next to the results.
- **Unresolved inputs do not participate in the signal.** A favorite text that fails to ground contributes nothing; the provenance panel shows it as "unresolved" rather than a guess.
- **Dining coverage depends on Qloo locality data for the requested city.** In cities with sparse locality coverage, dining can return no candidates; the app will fail loudly with guidance rather than fake a pick.
- **Squad state lives in the URL (shareable, ephemeral).** Nothing is stored server-side; a refresh keeps the squad in the link, and closing the tab is enough to clear it.
- **Narration is model output.** It is constrained to Qloo facts but the phrasing is generated and may vary run to run.

## Repository structure

```
src/
  app/
    page.tsx                    Landing page — what this is, how it works.
    night/page.tsx              Squad room shell.
    night/room.tsx              Member/manager logic: squads of 2-5, name + up to 3 favorites each, city.
    night/console.tsx           Results UI: affinity bars, negotiation transcript, counterfactual panel, provenance.
    night/result/page.tsx       Result route; reads the squad from the URL, POSTs to /api/negotiate, renders console.
    api/negotiate/route.ts      Agent endpoint (server-only). POST { members, city? }.
  lib/
    agent/pipeline.ts           The 5-step pipeline: normalize/ground/gather/negotiate/narrate.
    agent/llm.ts                Thin Gemini wrapper (JSON mode) for narration and counterfactual.
    qloo/liveld.ts              (unused; see live.ts)
    qloo/live.ts                Live Qloo client: /search grounding, /v2/insights joint ranking, city filter, exclusions.
    qloo/mock.ts                Deterministic offline stand-in, for local dev without QLOO_API_KEY.
    qloo/index.ts               Client factory: live if QLOO_API_KEY is set, mock otherwise.
    qloo/client.ts              Shared client interface types.
    qloo/types.ts               Qloo entity types used by the pipeline.
    squad/codec.ts              Base64URL codec that keeps squad state in the shareable URL.
```

## Built for

The Qloo Agentic Hackathon, October 2026.
