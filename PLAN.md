# Squad Night — Design Spec

> "Agents are getting smarter, but they're culturally blind." — the hackathon brief.
> Squad Night is the fix for one universal moment: what do we actually *do* tonight?

## The product promise

One confident answer — one film, one place to eat — for a group of 2–5 friends,
grounded in Qloo's cross-category taste graph, with the reasoning shown, not
hidden. No login, no app install; a share link that has anyone contributing
their taste in under 20 seconds.

## The "incredible" bar (each element maps to a rubric criterion)

| # | Element | What judges see | Rubric it hits |
| --- | --- | --- | --- |
| 1 | **The Taste Reveal** | After the pick, each friend's cultural fingerprint is drawn — then the app resolves to the one "taste-space point" where the whole squad actually lives: a spot none of them had visited before. | Design |
| 2 | **Provenance, not vibes** | Every pick is annotated with the Qloo workflow that produced it and its affinity evidence. Transparency is the differentiator, not a debug panel. | Technical implementation, Submission guide ("provenance") |
| 3 | **The Counterfactual** | Side-by-side: what a generic LLM answers for this group vs. what Qloo's graph knows. We turn the brief's warning line ("works the same without Qloo?") into a live, undeniable demonstration. | Quality of idea |
| 4 | **The Negotiation transcript** | The agent shows its shortlist and why each candidate fell: "the comedy option carried only 1 of 3 people." Feels like an agent doing real work. | Technical implementation, Design |
| 5 | **Zero-friction live demo** | Judges reach a working group session on first click, no signup. They are required to *use* the app — frictionless is a scoring weapon. | Design, Usefulness |

## The agent pipeline

1. **Normalize** (LLM): each friend's free-text favorites → canonical entity
   names.
2. **Ground** (Qloo `find_tags` / entity search): names → real Qloo entity IDs
   and tags. Ambiguous matches are surfaced to the user as a "did you mean"
   moment — provenance starts here.
3. **Gather** (Qloo `describe entity` + recommendations): per-friend affinity
   profile across film and dining.
4. **Negotiate** (Qloo rank-a-shortlist over cross-entity signals): the agent
   forms a candidate shortlist of films + venues and ranks it *jointly* — the
   step no LLM can fake.
5. **Narrate** (LLM): one headliner pick + one dining pick + negotiation notes,
   in a voice like the smartest friend at the table. Qurlich-free: numbers
   stay attached to their sources.

## Architecture

- Next.js (App Router) on **Vercel** (free).
- All Qloo calls via server-side routes → local `qloo mcp` (harness) or direct
  HTTPS to `hackathon.api.qloo.com`. **The API key never enters the browser.**
- LLM: provider-agnostic (Groq or Gemini free tier), one small interface.
- `src/lib/qloo/` is the provider seam: live client behind the same typed
  interface as the mock, so we develop offline today and swap one file on key
  day.

## Submission checklist (from qloo-hackathon-kit + Devpost)

- [ ] Product problem statement (short)
- [ ] Which Qloo workflows we use and why they fit
- [ ] Redacted request→result walk-through, incl. entity/tag choices
- [ ] Live hosted demo (Vercel) — judges use it end-to-end
- [ ] Setup steps runnable from a clean environment
- [ ] Known limitations, incl. what the result does *not* establish
      (Qloo describes groups, not individuals — we say this in-UI)
- [ ] Public repo + open-source license (MIT) visible in About
- [ ] Text description: features + what makes it "Qloo-powered"

## Guardrails we respect (from SAFE_USE / API_ACCESS)

- Key stays in `.env.local` on the server; never in repo, browser, demo.
- No personal data (names, emails, device IDs) sent to Qloo — favorites only.
- Bounded retries; cache what we need; no bulk scraping.
- Clear auth/rate-limit errors surfaced, never silently misrepresented.
