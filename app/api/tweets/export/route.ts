/**
 * API route for exporting the full tweet collection
 * GET - Download every tweet's stored metadata and content as JSON
 */

import { type NextRequest, NextResponse } from "next/server";
import { requireApiSecret } from "@/lib/api-auth";
import { getTweetIds } from "@/lib/tweet-config";
import { fetchTweetsWithCache } from "@/lib/tweet-service";
import {
  getSavedTweetIdsFromStorage,
  getTweetMetadataBatch,
} from "@/lib/tweet-storage";

/**
 * GET /api/tweets/export
 * Returns the full collection as a downloadable JSON document
 */
export async function GET(request: NextRequest) {
  try {
    const authError = requireApiSecret(request);
    if (authError) {
      return authError;
    }

    const [tweetIds, savedTweetIds] = await Promise.all([
      getTweetIds(),
      getSavedTweetIdsFromStorage(),
    ]);
    const allIds = [...new Set([...tweetIds, ...savedTweetIds])];

    const [tweets, metadataBatch] = await Promise.all([
      // Read-only: a backup must never delete tweets X reports as unavailable
      fetchTweetsWithCache(allIds, { removeUnavailable: false }),
      getTweetMetadataBatch(allIds),
    ]);
    const contentById = new Map(tweets.map((tweet) => [tweet.id, tweet]));
    const metadataById = new Map(
      allIds.map((id, index) => [id, metadataBatch[index]])
    );

    const exportedAt = new Date().toISOString();
    const doc = {
      success: true,
      exportedAt,
      count: allIds.length,
      // Iterate allIds, not `tweets`: fetchTweetsWithCache drops tweets whose
      // content is unavailable, but their metadata still belongs in a backup.
      tweets: allIds.map((id) => ({
        id,
        metadata: metadataById.get(id) ?? null,
        content: contentById.get(id)?.content ?? null,
      })),
    };

    const yyyymmdd = exportedAt.slice(0, 10).replaceAll("-", "");
    return NextResponse.json(doc, {
      headers: {
        "Content-Disposition": `attachment; filename="tweets-export-${yyyymmdd}.json"`,
      },
    });
  } catch (error) {
    console.error("[API ERROR] Failed to export tweets:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
