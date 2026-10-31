import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tweet-storage", () => ({
  getTweetIdsFromStorage: vi.fn(),
  getTweetMetadata: vi.fn(),
  getTweetMetadataBatch: vi.fn(),
  removeTweetFromStorage: vi.fn(),
}));

import { cleanupOldTweets, getExpiredTweets } from "@/lib/tweet-cleanup";
import {
  getTweetIdsFromStorage,
  getTweetMetadataBatch,
  removeTweetFromStorage,
} from "@/lib/tweet-storage";

const mockGetTweetIds = vi.mocked(getTweetIdsFromStorage);
const mockGetMetadataBatch = vi.mocked(getTweetMetadataBatch);
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
  vi.restoreAllMocks();
});

describe("cleanupOldTweets", () => {
  it("deletes a tweet older than 3 days that is seen and not saved", async () => {
    mockGetTweetIds.mockResolvedValue(["111"]);
    mockGetMetadataBatch.mockResolvedValue([
      makeMetadata("111", { seen: true, submittedAt: NOW - 4 * DAY_MS }),
    ]);

    const result = await cleanupOldTweets();

    expect(mockGetMetadataBatch).toHaveBeenCalledWith(["111"]);
    expect(mockRemoveTweet).toHaveBeenCalledWith("111");
    expect(result).toEqual({
      deletedCount: 1,
      deletedTweetIds: ["111"],
      errors: [],
    });
  });

  it("does not delete an old, seen tweet that is saved", async () => {
    mockGetTweetIds.mockResolvedValue(["222"]);
    mockGetMetadataBatch.mockResolvedValue([
      makeMetadata("222", {
        saved: true,
        seen: true,
        submittedAt: NOW - 4 * DAY_MS,
      }),
    ]);

    const result = await cleanupOldTweets();

    expect(mockRemoveTweet).not.toHaveBeenCalled();
    expect(result.deletedCount).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it("does not delete an old tweet that is unseen", async () => {
    mockGetTweetIds.mockResolvedValue(["333"]);
    mockGetMetadataBatch.mockResolvedValue([
      makeMetadata("333", { seen: false, submittedAt: NOW - 4 * DAY_MS }),
    ]);

    const result = await cleanupOldTweets();

    expect(mockRemoveTweet).not.toHaveBeenCalled();
    expect(result.deletedCount).toBe(0);
  });

  it("does not delete a seen tweet newer than 3 days", async () => {
    mockGetTweetIds.mockResolvedValue(["444"]);
    mockGetMetadataBatch.mockResolvedValue([
      makeMetadata("444", { seen: true, submittedAt: NOW - 2 * DAY_MS }),
    ]);

    const result = await cleanupOldTweets();

    expect(mockRemoveTweet).not.toHaveBeenCalled();
    expect(result.deletedCount).toBe(0);
  });

  it("skips a tweet with null metadata without recording an error", async () => {
    mockGetTweetIds.mockResolvedValue(["555"]);
    mockGetMetadataBatch.mockResolvedValue([null]);

    const result = await cleanupOldTweets();

    expect(mockRemoveTweet).not.toHaveBeenCalled();
    expect(result).toEqual({
      deletedCount: 0,
      deletedTweetIds: [],
      errors: [],
    });
  });

  it("skips every tweet with a warning when the bulk fetch falls back to all nulls", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockGetTweetIds.mockResolvedValue(["901", "902", "903"]);
    mockGetMetadataBatch.mockResolvedValue([null, null, null]);

    const result = await cleanupOldTweets();

    expect(mockGetMetadataBatch).toHaveBeenCalledTimes(1);
    expect(mockRemoveTweet).not.toHaveBeenCalled();
    expect(result).toEqual({
      deletedCount: 0,
      deletedTweetIds: [],
      errors: [],
    });
    expect(warn.mock.calls).toEqual([
      ["[Cleanup] No metadata found for tweet 901"],
      ["[Cleanup] No metadata found for tweet 902"],
      ["[Cleanup] No metadata found for tweet 903"],
    ]);
  });

  it("records an error for a failed removal and keeps processing", async () => {
    mockGetTweetIds.mockResolvedValue(["666", "777"]);
    mockGetMetadataBatch.mockResolvedValue([
      makeMetadata("666", { seen: true, submittedAt: NOW - 5 * DAY_MS }),
      makeMetadata("777", { seen: true, submittedAt: NOW - 5 * DAY_MS }),
    ]);
    mockRemoveTweet.mockImplementation((id) => {
      if (id === "666") {
        return Promise.reject(new Error("redis unavailable"));
      }
      return Promise.resolve(true);
    });

    const result = await cleanupOldTweets();

    expect(result.errors).toEqual([
      { error: "redis unavailable", tweetId: "666" },
    ]);
    expect(result.deletedCount).toBe(1);
    expect(result.deletedTweetIds).toEqual(["777"]);
  });

  it("returns an empty result for empty storage", async () => {
    mockGetTweetIds.mockResolvedValue([]);

    const result = await cleanupOldTweets();

    expect(mockGetMetadataBatch).not.toHaveBeenCalled();
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
    mockGetMetadataBatch.mockResolvedValue([
      makeMetadata("old-seen", { seen: true, submittedAt: NOW - 6 * DAY_MS }),
      makeMetadata("old-saved", {
        saved: true,
        seen: true,
        submittedAt: NOW - 6 * DAY_MS,
      }),
      makeMetadata("fresh", { seen: true, submittedAt: NOW - 1 * DAY_MS }),
    ]);

    const expired = await getExpiredTweets();

    expect(expired).toEqual([
      {
        ageInDays: 6,
        id: "old-seen",
        seen: true,
        submittedAt: NOW - 6 * DAY_MS,
      },
    ]);
  });

  it("excludes old but unseen tweets", async () => {
    mockGetTweetIds.mockResolvedValue(["888"]);
    mockGetMetadataBatch.mockResolvedValue([
      makeMetadata("888", { seen: false, submittedAt: NOW - 10 * DAY_MS }),
    ]);

    expect(await getExpiredTweets()).toEqual([]);
  });

  it("returns an empty array when storage throws", async () => {
    mockGetTweetIds.mockRejectedValue(new Error("redis unavailable"));

    expect(await getExpiredTweets()).toEqual([]);
  });
});
