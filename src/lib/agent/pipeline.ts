import { createQlooClient } from "@/lib/qloo";
import type { GroundResult, QlooRanked } from "@/lib/qloo";
import { generateJson } from "./llm";

/**
 * The Squad Night agent pipeline: normalize → ground → gather → negotiate →
 * narrate. Every cultural fact in the output originates from a Qloo call
 * whose inputs and affinity scores are carried through to the UI for
 * provenance. The LLM writes prose about Qloo's facts; it never invents a
 * pick or a number.
 */

export interface SquadMemberInput {
  readonly name: string;
  /** Free-text favorites ("anything you love: film, music, food, spot"). */
  readonly picks: readonly string[];
}

export interface NegotiateRequest {
  readonly members: readonly SquadMemberInput[];
  /** Optional city/neighborhood to rank dining candidates geospatially. */
  readonly city?: string;
}

export interface PickWithEvidence {
  readonly title: string;
  readonly entityId?: string;
  readonly imageUrl?: string;
  /** Qloo's own affinity score for the squad's joint signal, verbatim. */
  readonly affinity: number;
  readonly popularity?: number;
}

export interface ShortlistEntry {
  readonly title: string;
  readonly affinity: number;
}

export interface GroundingReport {
  readonly member: string;
  readonly resolved: readonly { input: string; matchedAs: string }[];
  readonly notFound: readonly string[];
}

export interface NegotiateResult {
  readonly headline: string;
  readonly movie: PickWithEvidence;
  readonly restaurant: PickWithEvidence;
  readonly whyMovie: string;
  readonly whyFood: string;
  /** 3 lines about what lost and why — the negotiation transcript. */
  readonly negotiation: readonly string[];
  readonly squadVibe: string;
  readonly movieShortlist: readonly ShortlistEntry[];
  readonly restaurantShortlist: readonly ShortlistEntry[];
  readonly grounding: readonly GroundingReport[];
  /** What a no-taste-data assistant answers for the same squad. */
  readonly counterfactual: { movie: string; restaurant: string; note: string };
  readonly meta: {
    readonly groundedFavorites: number;
    readonly qlooCalls: number;
    readonly durationMs: number;
    /** Names of members whose entire picks failed to resolve. */
    readonly deadSignalMembers: readonly string[];
  };
}

export class NegotiateError extends Error {
  readonly status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.name = "NegotiateError";
    this.status = status;
  }
}

const LIMIT = 3;

const cleanTeam = (members: readonly SquadMemberInput[]): SquadMemberInput[] =>
  members.map((member) => ({
    name: member.name.trim() || "A friend",
    picks: member.picks.map((pick) => pick.trim()).filter(Boolean).slice(0, LIMIT),
  }));

const shortlist = (ranked: readonly QlooRanked[], count = 4): ShortlistEntry[] =>
  ranked.slice(0, count).map((entry) => ({ title: entry.entity.name, affinity: entry.affinity }));

const pickEvidence = (ranked: readonly QlooRanked[]): PickWithEvidence | null => {
  const top = ranked[0];
  if (!top) return null;
  return {
    title: top.entity.name,
    entityId: top.entity.entityId,
    imageUrl: top.entity.imageUrl,
    affinity: top.affinity,
    popularity: top.popularity,
  };
};

const buildGroundingReports = (
  members: readonly SquadMemberInput[],
  perMember: readonly (readonly GroundResult[])[],
): GroundingReport[] =>
  members.map((member, index) => {
    const results = perMember[index] ?? [];
    return {
      member: member.name,
      resolved: results
        .filter((result) => result.status === "matched" && result.matched)
        .map((result) => ({ input: result.input, matchedAs: result.matched!.name })),
      notFound: results.filter((result) => result.status !== "matched").map((result) => result.input),
    };
  });

const NARRATOR_SYSTEM = `You are the negotiator of Squad Night, an app that finds the one movie and one dining spot a friend group will all actually enjoy. You receive ONLY facts that were computed from Qloo's cultural taste graph (entity names, affinity scores in [0,1], the squad's grounded favorites). Voice: the smartest, warmest, slightly wry friend at the table. Rules:
- Every claim must be traceable to the provided Qloo facts. Cite affinity numbers when they carry the point.
- Never invent entities, stats, or taste claims. If facts are thin, be understated.
- Keep every field tight: headline <= 90 chars; whyMovie/whyFood <= 45 words; negotiation exactly 3 lines, each <= 30 words, each about a different discarded or losing option with its number; squadVibe <= 25 words.
Return JSON: {"headline": string, "whyMovie": string, "whyFood": string, "negotiation": [string, string, string], "squadVibe": string}`;

const COUNTERFACTUAL_SYSTEM = `You are a generic AI assistant with NO access to any taste, affinity, or cultural-graph data. You cannot know how any audience's preferences correlate. You are asked what a group of friends should watch and where to eat tonight. Behave honestly like such an assistant: produce safe, mainstream, popularity-flavored picks with generalized reasoning. Return JSON: {"movie": string, "restaurant": string, "note": string} where note, one sentence, is your own justification.`;

export const runNegotiation = async (request: NegotiateRequest): Promise<NegotiateResult> => {
  const started = Date.now();
  const members = cleanTeam(request.members);
  const totalPicks = members.reduce((sum, member) => sum + member.picks.length, 0);
  if (members.length < 2) {
    throw new NegotiateError("A squad needs at least 2 people — that's where the argument starts.", 422);
  }
  if (totalPicks < 4) {
    throw new NegotiateError("Add at least 4 favorites across the squad so there's something to negotiate.", 422);
  }

  const qloo = createQlooClient();

  // Ground each member's favorites concurrently. Only matched ids carry
  // signal; misses are reported as provenance, never silently dropped.
  const perMember = await Promise.all(
    members.map((member) =>
      qloo.ground({ favorites: member.picks.slice(0, LIMIT) }),
    ),
  );
  const groundingReports = buildGroundingReports(members, perMember);
  const deadSignalMembers = members
    .filter((_, index) => perMember[index].every((result) => result.status !== "matched"))
    .map((member) => member.name);

  const signalIds = [
    ...new Set(
      perMember
        .flat()
        .flatMap((result) => (result.status === "matched" && result.matched ? [result.matched.entityId] : [])),
    ),
  ];
  if (signalIds.length < 2) {
    throw new NegotiateError("Qloo could only resolve one favorite — at least two resolvable picks are needed.", 422);
  }

  const [movieRanked, restaurantRanked] = await Promise.all([
    qloo.recommend({ signalIds, target: "urn:entity:movie", take: 6 }),
    qloo.recommend({
      signalIds,
      target: "urn:entity:place.restaurant",
      locationQuery: request.city?.trim() || undefined,
      take: 6,
    }),
  ]);

  const movie = pickEvidence(movieRanked);
  const restaurant = pickEvidence(restaurantRanked);
  if (!movie && !restaurant) {
    throw new NegotiateError(
      "Qloo found no strong common ground for this squad's picks. Try naming more specific favorites — rarer tastes usually resolve better.",
      422,
    );
  }

  const facts = JSON.stringify({
    squad: members.map((member) => member.name),
    grounded: groundingReports.map((report) => ({
      member: report.member,
      resolvedFavorites: report.resolved.map((entry) => `${entry.input} → ${entry.matchedAs}`),
      unresolved: report.notFound,
    })),
    city: request.city ?? null,
    movieFindings: movieRanked.slice(0, 4).map((entry) => ({
      title: entry.entity.name,
      qlooAffinity: Number(entry.affinity.toFixed(3)),
      qlooPopularity: entry.popularity != null ? Number(entry.popularity.toFixed(2)) : null,
    })),
    diningFindings: restaurantRanked.slice(0, 4).map((entry) => ({
      name: entry.entity.name,
      qlooAffinity: Number(entry.affinity.toFixed(3)),
    })),
  });

  const narration = await generateJson<{
    headline: string;
    whyMovie: string;
    whyFood: string;
    negotiation: string[];
    squadVibe: string;
  }>(NARRATOR_SYSTEM, facts);

  const counterfactual = await generateJson<{ movie: string; restaurant: string; note: string }>(
    COUNTERFACTUAL_SYSTEM,
    JSON.stringify({
      squad: members.map((member) => ({ name: member.name, favorites: member.picks })),
      city: request.city ?? null,
    }),
  );

  return {
    headline: narration.headline,
    movie: movie ?? { title: "No consensus found", affinity: 0 },
    restaurant: restaurant ?? { title: "No consensus found", affinity: 0 },
    whyMovie: narration.whyMovie,
    whyFood: narration.whyFood,
    negotiation: narration.negotiation.slice(0, 3),
    squadVibe: narration.squadVibe,
    movieShortlist: shortlist(movieRanked),
    restaurantShortlist: shortlist(restaurantRanked),
    grounding: groundingReports,
    counterfactual,
    meta: {
      groundedFavorites: signalIds.length,
      qlooCalls: members.length + 2,
      durationMs: Date.now() - started,
      deadSignalMembers,
    },
  };
};
