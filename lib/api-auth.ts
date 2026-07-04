import { createHash, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Timing-safe string comparison. Hashing first equalizes lengths so
 * timingSafeEqual never throws and length is not observable.
 */
export function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Validates the request's API secret (x-api-secret header, with optional
 * fallback value e.g. from a request body). Fails closed when the env var
 * is missing. Returns null when authorized, otherwise the error response.
 */
export function requireApiSecret(
  request: NextRequest,
  bodySecret?: unknown
): NextResponse | null {
  const apiSecret = process.env.TWEET_API_SECRET;
  if (!apiSecret) {
    return NextResponse.json(
      { error: "API secret not configured on server" },
      { status: 500 }
    );
  }
  const provided =
    request.headers.get("x-api-secret") ??
    (typeof bodySecret === "string" ? bodySecret : null);
  if (!(provided && secretsMatch(provided, apiSecret))) {
    return NextResponse.json(
      { error: "Invalid or missing API secret" },
      { status: 401 }
    );
  }
  return null;
}
