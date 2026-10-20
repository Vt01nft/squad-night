import type { QlooClient } from "./client";
import { createMockQlooClient } from "./mock";
import { createLiveQlooClient } from "./live";

export type {
  QlooClient,
  GroundResult,
  QlooRanked,
  GroundingRequest,
  RecommendRequest,
  RecommendTarget,
  QlooEntity,
} from "./client";
export type { QlooEntityType } from "./types";

/**
 * Factory for the process-wide Qloo client. The workshop (mock) keeps
 * development going without quota, network, or a key; the live client
 * activates with QLOO_API_KEY. Never import this from a client component —
 * the key and the Qloo traffic are server-only.
 */
export const createQlooClient = (): QlooClient =>
  process.env.QLOO_API_KEY ? createLiveQlooClient() : createMockQlooClient();
