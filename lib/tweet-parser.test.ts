import { describe, expect, it } from "vitest";
import { isValidTweetId, parseTweetUrl } from "@/lib/tweet-parser";

const TWEET_ID = "1234567890123456789";
const CANONICAL_URL = `https://twitter.com/i/status/${TWEET_ID}`;

describe("parseTweetUrl", () => {
  it("parses a twitter.com status URL", () => {
    expect(
      parseTweetUrl(`https://twitter.com/user/status/${TWEET_ID}`)
    ).toEqual({
      id: TWEET_ID,
      url: CANONICAL_URL,
    });
  });

  it("parses an x.com status URL", () => {
    expect(parseTweetUrl(`https://x.com/user/status/${TWEET_ID}`)).toEqual({
      id: TWEET_ID,
      url: CANONICAL_URL,
    });
  });

  it("parses a mobile.twitter.com status URL", () => {
    expect(
      parseTweetUrl(`https://mobile.twitter.com/user/status/${TWEET_ID}`)
    ).toEqual({
      id: TWEET_ID,
      url: CANONICAL_URL,
    });
  });

  it("parses a URL with a query string", () => {
    expect(
      parseTweetUrl(`https://twitter.com/user/status/${TWEET_ID}?s=20`)
    ).toEqual({
      id: TWEET_ID,
      url: CANONICAL_URL,
    });
  });

  it("parses an uppercase host (case-insensitive)", () => {
    expect(parseTweetUrl(`https://X.com/user/status/${TWEET_ID}`)).toEqual({
      id: TWEET_ID,
      url: CANONICAL_URL,
    });
  });

  it("parses a raw numeric tweet ID", () => {
    expect(parseTweetUrl(TWEET_ID)).toEqual({
      id: TWEET_ID,
      url: CANONICAL_URL,
    });
  });

  it("trims leading/trailing whitespace around a raw ID", () => {
    expect(parseTweetUrl(`  ${TWEET_ID}  `)).toEqual({
      id: TWEET_ID,
      url: CANONICAL_URL,
    });
  });

  it("returns null for a non-URL string", () => {
    expect(parseTweetUrl("not a url")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseTweetUrl("")).toBeNull();
  });

  it("returns null for a status URL on an unrecognized host", () => {
    // example.com matches no host pattern, and the raw-ID pattern
    // requires the entire string to be digits
    expect(parseTweetUrl("https://example.com/status/123")).toBeNull();
  });
});

describe("isValidTweetId", () => {
  it("rejects 14 digits", () => {
    expect(isValidTweetId("12345678901234")).toBe(false);
  });

  it("accepts 15 digits", () => {
    expect(isValidTweetId("123456789012345")).toBe(true);
  });

  it("accepts 19 digits", () => {
    expect(isValidTweetId("1234567890123456789")).toBe(true);
  });

  it("rejects 20 digits", () => {
    expect(isValidTweetId("12345678901234567890")).toBe(false);
  });

  it("rejects digits mixed with letters", () => {
    expect(isValidTweetId("12345678901234a")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidTweetId("")).toBe(false);
  });
});
