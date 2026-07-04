/**
 * API route for managing tweets
 * POST - Add a new tweet
 * GET - Get all tweets (optional, mainly for testing)
 */

import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSecret } from "@/lib/api-auth";
import { parseTweetUrl } from "@/lib/tweet-parser";
import { addTweetToStorage, getTweetIdsFromStorage } from "@/lib/tweet-storage";

const postBodySchema = z.object({
  url: z.string().min(1).max(500),
  secret: z.string().optional(),
  submittedBy: z.string().trim().max(50).optional(),
});

/**
 * POST /api/tweets
 * Adds a new tweet to storage
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const bodySecret =
      rawBody && typeof rawBody === "object" && "secret" in rawBody
        ? (rawBody as { secret?: unknown }).secret
        : undefined;

    const authError = requireApiSecret(request, bodySecret);
    if (authError) {
      return authError;
    }

    const parseResult = postBodySchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { url, submittedBy } = parseResult.data;

    // Parse tweet URL
    const parsed = parseTweetUrl(url);
    if (!parsed) {
      return NextResponse.json(
        { error: "Invalid tweet URL or ID format" },
        { status: 400 }
      );
    }

    // Add to storage (will add new tweet or append poster to existing tweet)
    const metadata = await addTweetToStorage(parsed.id, submittedBy);

    // Revalidate the home page to show new tweet
    revalidatePath("/");

    return NextResponse.json(
      {
        success: true,
        tweetId: parsed.id,
        metadata,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API ERROR] Failed to add tweet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tweets
 * Returns all tweet IDs (for testing/debugging)
 */
export async function GET(request: NextRequest) {
  try {
    const authError = requireApiSecret(request);
    if (authError) {
      return authError;
    }

    const tweetIds = await getTweetIdsFromStorage();

    return NextResponse.json({
      success: true,
      tweetIds,
      count: tweetIds.length,
    });
  } catch (error) {
    console.error("[API ERROR] Failed to get tweets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
