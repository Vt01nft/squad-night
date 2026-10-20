import type { QlooEntityType } from "./types";

/** A resolved Qloo entity reference (the result of grounding a name). */
export interface QlooEntity {
  readonly entityId: string;
  readonly name: string;
  readonly type: QlooEntityType;
  /** Popularity in [0, 1], where 1 is most popular. */
  readonly popularity?: number;
  /** Optional poster/image url if Qloo supplies one. */
  readonly imageUrl?: string;
}

/**
 * Result of trying to resolve one squad favorite onto the Qloo graph.
 * `not_found` and `ambiguous` are first-class outcomes: the evidence panel
 * shows what the agent could not see, which is provenance just as much as
 * the matches themselves.
 */
export interface GroundResult {
  readonly input: string;
  readonly status: "matched" | "not_found";
  readonly matched?: QlooEntity;
  /** Other plausible resolutions, shown when a match is uncertain. */
  readonly alternatives?: readonly QlooEntity[];
}

/**
 * One ranked recommendation with the affinity evidence behind it. The
 * affinity is Qloo's own `query.affinity` ([0,1]) relative to the squad's
 * joint signal — displayed in the UI verbatim, never recomputed.
 */
export interface QlooRanked {
  readonly entity: QlooEntity;
  readonly affinity: number;
  /** Qloo popularity in [0,1]; evidence for "don't default to mainstream". */
  readonly popularity?: number;
}

export interface GroundingRequest {
  readonly favorites: readonly string[];
  /** Type hint to bias search resolution (e.g. movies vs places). */
  readonly hint?: QlooEntityType;
}

export type RecommendTarget =
  | Extract<QlooEntityType, "urn:entity:movie" | "urn:entity:place.restaurant">
  | "urn:entity:tv_show";

export interface RecommendRequest {
  /** Qloo entity ids from every squad member's grounded favorites. */
  readonly signalIds: readonly string[];
  readonly target: RecommendTarget;
  /** For places: city/neighborhood string passed as signal.location.query. */
  readonly locationQuery?: string;
  readonly take?: number;
}

/**
 * The Qloo data seam. `createQlooClient()` returns the live client when
 * `QLOO_API_KEY` is present, otherwise the deterministic mock. Everything
 * the app knows about Qloo flows through this interface.
 */
export interface QlooClient {
  /** Resolve squad members' free-text favorites into canonical entities. */
  ground(request: GroundingRequest): Promise<GroundResult[]>;
  /** Rank tonight's candidates against the squad's joint signal. */
  recommend(request: RecommendRequest): Promise<QlooRanked[]>;
}
