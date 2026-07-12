import { createConvexHttpClient, createConvexStore, type ConvexClientLike } from "./convex-store";
import { createMemoryStore } from "./memory";
import type { EngagementStore } from "./types";

export * from "./types";

type ConvexClientFactory = (url: string) => ConvexClientLike;

/** Select real Convex persistence when configured, otherwise use the demo store. */
export function createStoreForEnvironment(
  convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL,
  serverSecret = process.env.MIZAN_CONVEX_SERVER_SECRET,
  clientFactory: ConvexClientFactory = createConvexHttpClient,
): EngagementStore {
  if (!convexUrl) return createMemoryStore();
  if (!serverSecret) throw new Error("MIZAN_CONVEX_SERVER_SECRET is required when NEXT_PUBLIC_CONVEX_URL is configured.");
  return createConvexStore(clientFactory(convexUrl), serverSecret);
}

/**
 * The store is pinned on globalThis so Next.js dev HMR and multiple module
 * imports share a single instance within the server process. A configured
 * NEXT_PUBLIC_CONVEX_URL switches all reads and writes to the real deployment.
 */
const globalForStore = globalThis as unknown as {
  __mizanStore?: EngagementStore;
  __mizanStoreUrl?: string;
  __mizanStoreSecret?: string;
};

export function getStore(): EngagementStore {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const serverSecret = process.env.MIZAN_CONVEX_SERVER_SECRET;
  if (!globalForStore.__mizanStore || globalForStore.__mizanStoreUrl !== convexUrl || globalForStore.__mizanStoreSecret !== serverSecret) {
    globalForStore.__mizanStore = createStoreForEnvironment(convexUrl, serverSecret);
    globalForStore.__mizanStoreUrl = convexUrl;
    globalForStore.__mizanStoreSecret = serverSecret;
  }
  return globalForStore.__mizanStore;
}
