import type { QlooClient, GroundResult, QlooRanked, RecommendRequest, QlooEntity } from "./client";

/**
 * Deterministic offline stand-in for the live Qloo client — same shape, same
 * guarantees. Kept for local development without quota or network and as a
 * fallback if the live API rate-limits during judging. Results are stable
 * per input, which keeps demo screenshots reproducible.
 */

const MOCK_MOVIES: readonly QlooEntity[] = [
  { entityId: "MOCK-MOVIE-1", name: "Memento", type: "urn:entity:movie", popularity: 0.91 },
  { entityId: "MOCK-MOVIE-2", name: "City of God", type: "urn:entity:movie", popularity: 0.88 },
  { entityId: "MOCK-MOVIE-3", name: "Coco", type: "urn:entity:movie", popularity: 0.93 },
  { entityId: "MOCK-MOVIE-4", name: "Chinatown", type: "urn:entity:movie", popularity: 0.84 },
];

const MOCK_RESTAURANTS: readonly QlooEntity[] = [
  { entityId: "MOCK-REST-1", name: "Kaduna Bistro", type: "urn:entity:place.restaurant", popularity: 0.72 },
  { entityId: "MOCK-REST-2", name: "Tonkotsu West", type: "urn:entity:place.restaurant", popularity: 0.79 },
  { entityId: "MOCK-REST-3", name: "La Cantina Fresca", type: "urn:entity:place.restaurant", popularity: 0.68 },
];

/** Cheap stable 32-bit string hash for the mock's determinism. */
const hash = (value: string): number => {
  let running = 0;
  for (const character of value) {
    running = (running * 31 + character.charCodeAt(0)) | 0;
  }
  return Math.abs(running) % 900;
};

const titleCase = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

/** Simulate network latency so loading states behave like the real thing. */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createMockQlooClient = (): QlooClient => ({
  async ground({ favorites }) {
    await delay(250);
    return favorites.map((input): GroundResult => {
      const resolved: QlooEntity = {
        entityId: `MOCK-GROUND-${hash(input)}`,
        name: titleCase(input),
        type: "urn:entity:movie",
        popularity: 0.8,
      };
      return { input, status: "matched", matched: resolved };
    });
  },

  async recommend(request: RecommendRequest) {
    await delay(400);
    const pool = request.target === "urn:entity:place.restaurant" ? MOCK_RESTAURANTS : MOCK_MOVIES;
    const seed = hash(request.signalIds.join(",")) / 100;
    return pool.map(
      (entity, index): QlooRanked => ({
        entity,
        affinity: Math.max(0.05, 0.92 - index * 0.13 - seed),
        popularity: entity.popularity,
      }),
    );
  },
});
