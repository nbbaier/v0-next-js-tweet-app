/**
 * SSE endpoint for real-time tweet updates
 * Streams changes to connected clients
 */

import { type NextRequest } from "next/server";
import { getTweetIdsFromStorage } from "@/lib/tweet-storage";
import { fetchTweetsWithCache } from "@/lib/tweet-service";

/**
 * GET /api/tweets/stream
 * Server-Sent Events endpoint for real-time updates
 */
export async function GET(request: NextRequest) {
	const encoder = new TextEncoder();

	// Create a ReadableStream for SSE
	const stream = new ReadableStream({
		async start(controller) {
			// Helper to send SSE message
			const sendEvent = (event: string, data: unknown) => {
				const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
				controller.enqueue(encoder.encode(message));
			};

			// Helper to send heartbeat (keep connection alive)
			const sendHeartbeat = () => {
				controller.enqueue(encoder.encode(": heartbeat\n\n"));
			};

			// Send initial connection message
			sendEvent("connected", { message: "Connected to tweet stream" });

			// Store last known state
			let lastTweetIds: string[] = [];
			let lastTweetsData = new Map<string, string>(); // Store serialized tweet data for comparison

			try {
				// Set up polling interval (check every 3 seconds)
				const pollInterval = setInterval(async () => {
					try {
						// Get current tweet IDs
						const currentTweetIds = await getTweetIdsFromStorage();

						// Detect new tweets
						const newTweetIds = currentTweetIds.filter(
							(id) => !lastTweetIds.includes(id),
						);

						// Detect removed tweets
						const removedTweetIds = lastTweetIds.filter(
							(id) => !currentTweetIds.includes(id),
						);

						// Fetch full data for new tweets
						if (newTweetIds.length > 0) {
							const newTweets = await fetchTweetsWithCache(newTweetIds);
							for (const tweet of newTweets) {
								sendEvent("tweet:added", tweet);
								lastTweetsData.set(tweet.id, JSON.stringify(tweet));
							}
						}

						// Send removed tweet events
						for (const tweetId of removedTweetIds) {
							sendEvent("tweet:removed", { id: tweetId });
							lastTweetsData.delete(tweetId);
						}

						// Check for metadata changes in existing tweets
						const existingTweetIds = currentTweetIds.filter(
							(id) => lastTweetIds.includes(id),
						);

						if (existingTweetIds.length > 0) {
							const currentTweets = await fetchTweetsWithCache(existingTweetIds);
							for (const tweet of currentTweets) {
								const currentData = JSON.stringify(tweet);
								const lastData = lastTweetsData.get(tweet.id);

								if (lastData !== currentData) {
									// Metadata changed, send update
									sendEvent("tweet:updated", tweet);
									lastTweetsData.set(tweet.id, currentData);
								}
							}
						}

						// Check if order changed
						if (
							newTweetIds.length === 0 &&
							removedTweetIds.length === 0 &&
							JSON.stringify(currentTweetIds) !== JSON.stringify(lastTweetIds)
						) {
							sendEvent("tweet:reorder", { tweetIds: currentTweetIds });
						}

						// Update last known state
						lastTweetIds = currentTweetIds;
					} catch (error) {
						console.error("[Stream] Error polling for updates:", error);
						sendEvent("error", { message: "Failed to fetch updates" });
					}
				}, 3000);

				// Send heartbeat every 30 seconds to keep connection alive
				const heartbeatInterval = setInterval(sendHeartbeat, 30000);

				// Clean up on abort
				request.signal.addEventListener("abort", () => {
					clearInterval(pollInterval);
					clearInterval(heartbeatInterval);
					controller.close();
				});

				// Initial fetch - populate state
				lastTweetIds = await getTweetIdsFromStorage();
				if (lastTweetIds.length > 0) {
					const initialTweets = await fetchTweetsWithCache(lastTweetIds);
					for (const tweet of initialTweets) {
						lastTweetsData.set(tweet.id, JSON.stringify(tweet));
					}
				}
			} catch (error) {
				console.error("[Stream] Fatal error:", error);
				sendEvent("error", { message: "Stream initialization failed" });
				controller.close();
			}
		},
	});

	// Return SSE response
	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache, no-transform",
			Connection: "keep-alive",
		},
	});
}
