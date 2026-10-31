import { NextRequest } from "next/server";
import type { Tweet } from "react-tweet/api";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-tweet/api", () => ({ fetchTweet: vi.fn() }));
vi.mock("@/lib/tweet-cache", () => ({
  getCachedTweets: vi.fn(),
  setCachedTweet: vi.fn(),
}));
vi.mock("@/lib/tweet-storage", () => ({
  getSavedTweetIdsFromStorage: vi.fn(),
  getTweetIdsFromStorage: vi.fn(),
  getTweetMetadataBatch: vi.fn(),
  removeTweetFromStorage: vi.fn(),
}));

import { fetchTweet } from "react-tweet/api";
import { GET } from "@/app/api/tweets/export/route";
import { getCachedTweets, setCachedTweet } from "@/lib/tweet-cache";
import {
  getSavedTweetIdsFromStorage,
  getTweetIdsFromStorage,
  getTweetMetadataBatch,
  removeTweetFromStorage,
} from "@/lib/tweet-storage";

const mockFetchTweet = vi.mocked(fetchTweet);
const mockGetCachedTweets = vi.mocked(getCachedTweets);
const mockGetFeedIds = vi.mocked(getTweetIdsFromStorage);
const mockGetSavedIds = vi.mocked(getSavedTweetIdsFromStorage);
const mockGetMetadataBatch = vi.mocked(getTweetMetadataBatch);
const mockRemoveTweet = vi.mocked(removeTweetFromStorage);

const SECRET = "test-secret";
const ATTACHMENT_HEADER = /^attachment; filename="tweets-export-\d{8}\.json"$/;

function makeMetadata(id: string, overrides: { saved?: boolean } = {}) {
  return {
    id,
    posters: [{ name: "someone", submittedAt: 1000 }],
    submittedAt: 1000,
    url: `https://twitter.com/i/status/${id}`,
    ...overrides,
  };
}

function makeTweet(id: string): Tweet {
  return {
    display_text_range: [0, 8],
    entities: { hashtags: [], symbols: [], urls: [], user_mentions: [] },
    id_str: id,
    text: `tweet ${id}`,
  } as unknown as Tweet;
}

function exportRequest(secret?: string): NextRequest {
  const headers = secret ? { "x-api-secret": secret } : undefined;
  return new NextRequest("http://localhost/api/tweets/export", { headers });
}

/** Wire storage mocks so metadata lookups follow the requested ID order. */
function setupStorage(
  feedIds: string[],
  savedIds: string[],
  metadata: Record<string, ReturnType<typeof makeMetadata>>
) {
  mockGetFeedIds.mockResolvedValue(feedIds);
  mockGetSavedIds.mockResolvedValue(savedIds);
  mockGetMetadataBatch.mockImplementation(async (ids) =>
    ids.map((id) => metadata[id] ?? null)
  );
  mockGetCachedTweets.mockImplementation(async (ids) => ids.map(() => null));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("TWEET_API_SECRET", SECRET);
  vi.mocked(setCachedTweet).mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/tweets/export", () => {
  it("rejects a missing secret", async () => {
    const response = await GET(exportRequest());
    expect(response.status).toBe(401);
    expect(mockGetFeedIds).not.toHaveBeenCalled();
  });

  it("rejects a wrong secret", async () => {
    const response = await GET(exportRequest("wrong"));
    expect(response.status).toBe(401);
    expect(mockGetFeedIds).not.toHaveBeenCalled();
  });

  it("exports feed and saved-only tweets once each, as an attachment", async () => {
    setupStorage(["a", "b"], ["b", "c"], {
      a: makeMetadata("a"),
      b: makeMetadata("b", { saved: true }),
      c: makeMetadata("c", { saved: true }),
    });
    mockFetchTweet.mockImplementation(async (id) => ({
      data: makeTweet(id),
    }));

    const response = await GET(exportRequest(SECRET));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toMatch(
      ATTACHMENT_HEADER
    );

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.count).toBe(3);
    expect(body.tweets.map((t: { id: string }) => t.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(body.tweets[2].metadata.saved).toBe(true);
    expect(body.tweets[2].content.id_str).toBe("c");
  });

  it("keeps unavailable tweets' metadata and never deletes them", async () => {
    setupStorage(["gone", "missing"], ["gone"], {
      gone: makeMetadata("gone", { saved: true }),
      missing: makeMetadata("missing"),
    });
    mockFetchTweet.mockImplementation(async (id) =>
      id === "gone" ? { tombstone: true } : { notFound: true }
    );

    const response = await GET(exportRequest(SECRET));
    const body = await response.json();

    expect(mockRemoveTweet).not.toHaveBeenCalled();
    expect(body.count).toBe(2);
    expect(body.tweets).toEqual([
      {
        content: null,
        id: "gone",
        metadata: makeMetadata("gone", { saved: true }),
      },
      { content: null, id: "missing", metadata: makeMetadata("missing") },
    ]);
  });
});
