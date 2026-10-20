import type { QlooClient, GroundResult, QlooRanked, RecommendRequest, RecommendTarget, QlooEntity } from "./client";
import type { QlooEntityType } from "./types";

/**
 * Live Qloo implementation against the hackathon-hosted Insights API.
 *
 * Flow, verified live against https://hackathon.api.qloo.com:
 *  1. `ground` — GET /search?query=… resolves free-text names to entities.
 *  2. recommendations — GET /v2/insights with `signal.interests.entities`
 *     (comma-separated grounded ids) ranks candidates jointly; each result
 *     carries `query.affinity` in [0,1], which is the evidence number the UI
 *     displays verbatim.
 *
 * The API key is injected server-side only; never import this module from a
 * client component.
 */

const DEFAULT_BASE = "https://hackathon.api.qloo.com";

interface QlooApiEntity {
  entity_id: string;
  name: string;
  type?: string;
  subtype?: string;
  /** Search results carry `types`; insights results carry `subtype`. */
  types?: string[];
  popularity?: number;
  properties?: {
    year?: number;
    description?: string;
    image?: { url?: string };
  };
  tags?: { id: string; name: string }[];
  /** Insights results carry the affinity evidence under query.affinity. */
  query?: { affinity?: number };
}

const TYPE_MOVIE = "urn:entity:movie";
const TYPE_PLACE = "urn:entity:place";

/** Best-effort primary category for an entity; unknown categories stay raw. */
const detectType = (entity: QlooApiEntity): QlooEntityType => {
  const known = entity.subtype ?? entity.types?.[0] ?? "";
  if (known.includes("movie")) return "urn:entity:movie";
  if (known.includes("tv_show")) return "urn:entity:tv_show";
  if (known.includes("artist")) return "urn:entity:artist";
  if (known.includes("place")) return "urn:entity:place.restaurant";
  if (known.includes("brand")) return "urn:entity:brand";
  // Unmapped-but-valid Qloo categories keep the pipeline truthful about
  // what was grounded; the union stays a fixed contract.
  return "urn:entity";
};

const toEntity = (api: QlooApiEntity): QlooEntity => ({
  entityId: api.entity_id,
  name: api.name,
  type: detectType(api),
  popularity: api.popularity,
  imageUrl: api.properties?.image?.url,
});

const toRanked = (api: QlooApiEntity): QlooRanked => ({
  entity: toEntity(api),
  affinity: api.query?.affinity ?? 0,
  popularity: api.popularity,
});

export const createLiveQlooClient = (): QlooClient => {
  const apiKey = process.env.QLOO_API_KEY;
  if (!apiKey) throw new Error("QLOO_API_KEY is not set; cannot create live client.");
  const base = process.env.QLOO_BASE_URL ?? DEFAULT_BASE;

  const headers: HeadersInit = { "X-Api-Key": apiKey };
  /** Bounded retry: single retry after 400ms, matching the kit's bounded guidance. */
  const call = async (path: string): Promise<Response> => {
    let response: Response;
    try {
      response = await fetch(new URL(path, base), { headers, signal: AbortSignal.timeout(15_000) });
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 400));
      response = await fetch(new URL(path, base), { headers, signal: AbortSignal.timeout(15_000) });
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Qloo ${path} failed ${response.status}: ${detail.slice(0, 240)}`);
    }
    return response;
  };

  /** Resolve one free-text favorite; returns ranked candidates, best first. */
  const searchEntity = async (query: string, hint?: QlooEntityType): Promise<QlooApiEntity[]> => {
    const raw = await call(`/search?query=${encodeURIComponent(query)}`);
    const json = (await raw.json()) as { results?: QlooApiEntity[] };
    const results = json.results ?? [];
    const candidateType = hint === "urn:entity:place.restaurant" ? TYPE_PLACE : undefined;
    const preferred = candidateType
      ? results.filter((e) => e.types?.includes(candidateType))
      : results;
    return preferred.length ? preferred : results;
  };

  const groundOne = async (favorite: string, hint?: QlooEntityType): Promise<GroundResult> => {
    const candidates = await searchEntity(favorite, hint);
    const matched = candidates[0];
    if (!matched) return { input: favorite, status: "not_found" };
    return {
      input: favorite,
      status: "matched",
      matched: toEntity(matched),
      // Runner-up matches are provenance: what your text could also have meant.
      alternatives: candidates.slice(1, 3).map(toEntity),
    };
  };

  const rank = async (
    target: RecommendTarget,
    signalIds: readonly string[],
    options?: { locationQuery?: string; take?: number },
  ): Promise<QlooRanked[]> => {
    if (!signalIds.length) return [];
    const params = new URLSearchParams();
    params.set("signal.interests.entities", signalIds.join(","));
    params.set("take", String(options?.take ?? 8));
    if (target === "urn:entity:place.restaurant") {
      params.set("filter.type", TYPE_PLACE);
      params.set("filter.tags", "urn:tag:genre:place:restaurant");
      // Verified live: restricts dining results to venues in the named
      // locality. signal.location only biases the signal; filter.location
      // curtails the candidate set so picks are city-true.
      if (options?.locationQuery) params.set("filter.location.query", options.locationQuery);
    } else {
      params.set("filter.type", target);
      // Don't recommend back the entities the squad already named.
      params.set("filter.exclude.entities", signalIds.join(","));
    }
    const raw = await call(`/v2/insights/?${params.toString()}`);
    const json = (await raw.json()) as { results?: { entities?: QlooApiEntity[] } };
    return (json.results?.entities ?? []).filter((e) => (e.query?.affinity ?? 0) > 0).map(toRanked);
  };

  return {
    async ground(request) {
      return Promise.all(request.favorites.map((favorite) => groundOne(favorite, request.hint)));
    },
    async recommend(request: RecommendRequest) {
      return rank(request.target, request.signalIds, {
        locationQuery: request.locationQuery,
        take: request.take,
      });
    },
  };
};
