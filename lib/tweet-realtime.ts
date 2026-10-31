import type { EventData, EventPath, Realtime } from "@upstash/realtime";
import { realtime } from "./realtime";

const TWEETS_CHANNEL = "tweets";

type RealtimeOpts = typeof realtime extends Realtime<infer O> ? O : never;

/**
 * Publishes an event on the global tweets channel.
 * Never throws: realtime is best-effort, so a failed publish must not turn a
 * successful storage write into an error response.
 */
export async function publishTweetEvent<K extends EventPath<RealtimeOpts>>(
  event: K,
  data: EventData<RealtimeOpts, K>
): Promise<void> {
  try {
    await realtime.channel(TWEETS_CHANNEL).emit(event, data);
    console.log(`[Realtime] Published ${event}`);
  } catch (error) {
    console.error(`[Realtime ERROR] Failed to publish ${event}:`, error);
  }
}
