import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tweet-storage", () => ({
  getTweetIdsFromStorage: vi.fn(),
  getTweetMetadata: vi.fn(),
  getTweetMetadatas: vi.fn(),
  removeTweetFromStorage: vi.fn(),
}));

import { cleanupOldTweets, getExpiredTweets } from "@/lib/tweet-cleanup";
import {
  getTweetIdsFromStorage,
  getTweetMetadata,
  removeTweetFromStorage,
} from "@/lib/tweet-storage";

const mockGetTweetIds = vi.mocked(getTweetIdsFromStorage);
const mockGetMetadata = vi.mocked(getTweetMetadata);
const mockRemoveTweet = vi.mocked(removeTweetFromStorage);

const NOW = new Date("2026-07-01T00:00:00Z").getTime();
const DAY_MS = 24 * 60 * 60 * 1000;

function makeMetadata(
  id: string,
  overrides: { submittedAt: number; seen?: boolean; saved?: boolean }
) {
  return {
    id,
    posters: [{ name: "someone", submittedAt: overrides.submittedAt }],
    url: `https://twitter.com/i/status/${id}`,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  mockRemoveTweet.mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("cleanupOldTweets", () => {
  it("deletes a tweet older than 3 days that is seen and not saved", async () => {
    mockGetTweetIds.mockResolvedValue(["111"]);
    mockGetMetadata.mockResolvedValue(
      makeMetadata("111", { submittedAt: NOW - 4 * DAY_MS, seen: true })
    );

    const result = await cleanupOldTweets();

    expect(mockRemoveTweet).toHaveBeenCalledWith("111");
    expect(result).toEqual({
      deletedCount: 1,
      deletedTweetIds: ["111"],
      errors: [],
    });
  });

  it("does not delete an old, seen tweet that is saved", async () => {
    mockGetTweetIds.mockResolvedValue(["222"]);
    mockGetMetadata.mockResolvedValue(
      makeMetadata("222", {
        submittedAt: NOW - 4 * DAY_MS,
        seen: true,
        saved: true,
      })
    );

    const result = await cleanupOldTweets();

    expect(mockRemoveTweet).not.toHaveBeenCalled();
    expect(result.deletedCount).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it("does not delete an old tweet that is unseen", async () => {
    mockGetTweetIds.mockResolvedValue(["333"]);
    mockGetMetadata.mockResolvedValue(
      makeMetadata("333", { submittedAt: NOW - 4 * DAY_MS, seen: false })
    );

    const result = await cleanupOldTweets();

    expect(mockRemoveTweet).not.toHaveBeenCalled();
    expect(result.deletedCount).toBe(0);
  });

  it("does not delete a seen tweet newer than 3 days", async () => {
    mockGetTweetIds.mockResolvedValue(["444"]);
    mockGetMetadata.mockResolvedValue(
      makeMetadata("444", { submittedAt: NOW - 2 * DAY_MS, seen: true })
    );

    const result = await cleanupOldTweets();

    expect(mockRemoveTweet).not.toHaveBeenCalled();
    expect(result.deletedCount).toBe(0);
  });

  it("skips a tweet with null metadata without recording an error", async () => {
    mockGetTweetIds.mockResolvedValue(["555"]);
    mockGetMetadata.mockResolvedValue(null);

    const result = await cleanupOldTweets();

    expect(mockRemoveTweet).not.toHaveBeenCalled();
    expect(result).toEqual({
      deletedCount: 0,
      deletedTweetIds: [],
      errors: [],
    });
  });

  it("records an error for a failed removal and keeps processing", async () => {
    mockGetTweetIds.mockResolvedValue(["666", "777"]);
    mockGetMetadata.mockImplementation((id) =>
      Promise.resolve(
        makeMetadata(id, { submittedAt: NOW - 5 * DAY_MS, seen: true })
      )
    );
    mockRemoveTweet.mockImplementation((id) => {
      if (id === "666") {
        return Promise.reject(new Error("redis unavailable"));
      }
      return Promise.resolve(true);
    });

    const result = await cleanupOldTweets();

    expect(result.errors).toEqual([
      { tweetId: "666", error: "redis unavailable" },
    ]);
    expect(result.deletedCount).toBe(1);
    expect(result.deletedTweetIds).toEqual(["777"]);
  });

  it("returns an empty result for empty storage", async () => {
    mockGetTweetIds.mockResolvedValue([]);

    const result = await cleanupOldTweets();

    expect(mockGetMetadata).not.toHaveBeenCalled();
    expect(result).toEqual({
      deletedCount: 0,
      deletedTweetIds: [],
      errors: [],
    });
  });
});

describe("getExpiredTweets", () => {
  it("returns only old, seen, unsaved tweets with ageInDays populated", async () => {
    mockGetTweetIds.mockResolvedValue(["old-seen", "old-saved", "fresh"]);
    mockGetMetadata.mockImplementation((id) => {
      if (id === "old-seen") {
        return Promise.resolve(
          makeMetadata(id, { submittedAt: NOW - 6 * DAY_MS, seen: true })
        );
      }
      if (id === "old-saved") {
        return Promise.resolve(
          makeMetadata(id, {
            submittedAt: NOW - 6 * DAY_MS,
            seen: true,
            saved: true,
          })
        );
      }
      return Promise.resolve(
        makeMetadata(id, { submittedAt: NOW - 1 * DAY_MS, seen: true })
      );
    });

    const expired = await getExpiredTweets();

    expect(expired).toEqual([
      {
        id: "old-seen",
        submittedAt: NOW - 6 * DAY_MS,
        ageInDays: 6,
        seen: true,
      },
    ]);
  });

  it("excludes old but unseen tweets", async () => {
    mockGetTweetIds.mockResolvedValue(["888"]);
    mockGetMetadata.mockResolvedValue(
      makeMetadata("888", { submittedAt: NOW - 10 * DAY_MS, seen: false })
    );

    expect(await getExpiredTweets()).toEqual([]);
  });

  it("returns an empty array when storage throws", async () => {
    mockGetTweetIds.mockRejectedValue(new Error("redis unavailable"));

    expect(await getExpiredTweets()).toEqual([]);
  });
});
