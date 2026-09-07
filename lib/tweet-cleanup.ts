/**
 * Tweet cleanup utility
 * Handles automatic deletion of tweets older than specified retention period
 * Only deletes tweets that are both old AND marked as seen
 */

import {
  getTweetIdsFromStorage,
  getTweetMetadataBatch,
  removeTweetFromStorage,
} from "./tweet-storage";

// Retention period in milliseconds (3 days)
const RETENTION_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

interface CleanupResult {
  deletedCount: number;
  deletedTweetIds: string[];
  errors: Array<{ tweetId: string; error: string }>;
}

/**
 * Removes tweets older than the retention period (3 days) that have been marked as seen
 * Unseen tweets are preserved regardless of age
 * @returns Object containing cleanup statistics
 */
export async function cleanupOldTweets(): Promise<CleanupResult> {
  const result: CleanupResult = {
    deletedCount: 0,
    deletedTweetIds: [],
    errors: [],
  };

  try {
    // Get all tweet IDs from storage
    const tweetIds = await getTweetIdsFromStorage();
    console.log(`[Cleanup] Found ${tweetIds.length} tweets to check`);

    if (tweetIds.length === 0) {
      console.log("[Cleanup] No tweets to clean up");
      return result;
    }

    const now = Date.now();
    const cutoffTime = now - RETENTION_PERIOD_MS;

    // Fetch all metadata in a single bulk request (reduces N Redis GETs to 1 MGET)
    const metadataBatch = await getTweetMetadataBatch(tweetIds);

    // Check each tweet and delete if older than retention period AND marked as seen
    for (let i = 0; i < tweetIds.length; i++) {
      const tweetId = tweetIds[i];
      const metadata = metadataBatch[i];

      try {
        if (!metadata) {
          console.warn(`[Cleanup] No metadata found for tweet ${tweetId}`);
          continue;
        }

        // Check if tweet is older than retention period AND has been seen AND is not saved
        if (
          metadata.submittedAt < cutoffTime &&
          metadata.seen === true &&
          metadata.saved !== true
        ) {
          const ageInDays =
            (now - metadata.submittedAt) / (24 * 60 * 60 * 1000);
          console.log(
            `[Cleanup] Deleting tweet ${tweetId} (age: ${ageInDays.toFixed(1)} days, seen: true)`
          );

          await removeTweetFromStorage(tweetId);
          result.deletedCount++;
          result.deletedTweetIds.push(tweetId);
        } else if (metadata.submittedAt < cutoffTime && !metadata.seen) {
          console.log(
            `[Cleanup] Skipping unseen tweet ${tweetId} (age: ${((now - metadata.submittedAt) / (24 * 60 * 60 * 1000)).toFixed(1)} days)`
          );
        }
      } catch (error) {
        console.error(
          `[Cleanup ERROR] Failed to process tweet ${tweetId}:`,
          error
        );
        result.errors.push({
          tweetId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    console.log(
      `[Cleanup] Completed: deleted ${result.deletedCount} tweets, ${result.errors.length} errors`
    );
    return result;
  } catch (error) {
    console.error("[Cleanup ERROR] Failed to cleanup old tweets:", error);
    throw error;
  }
}

/**
 * Gets tweets that will be deleted in the next cleanup
 * (for preview/debugging purposes)
 * Only includes tweets that are both old AND seen
 */
export async function getExpiredTweets(): Promise<
  Array<{ id: string; submittedAt: number; ageInDays: number; seen: boolean }>
> {
  try {
    const tweetIds = await getTweetIdsFromStorage();
    if (tweetIds.length === 0) {
      return [];
    }

    const metadataBatch = await getTweetMetadataBatch(tweetIds);
    const now = Date.now();
    const cutoffTime = now - RETENTION_PERIOD_MS;
    const expiredTweets: Array<{
      id: string;
      submittedAt: number;
      ageInDays: number;
      seen: boolean;
    }> = [];

    for (let i = 0; i < tweetIds.length; i++) {
      const tweetId = tweetIds[i];
      const metadata = metadataBatch[i];

      if (
        metadata &&
        metadata.submittedAt < cutoffTime &&
        metadata.seen === true &&
        metadata.saved !== true
      ) {
        const ageInDays = (now - metadata.submittedAt) / (24 * 60 * 60 * 1000);
        expiredTweets.push({
          id: tweetId,
          submittedAt: metadata.submittedAt,
          ageInDays,
          seen: metadata.seen,
        });
      }
    }

    return expiredTweets;
  } catch (error) {
    console.error("[Cleanup ERROR] Failed to get expired tweets:", error);
    return [];
  }
}
