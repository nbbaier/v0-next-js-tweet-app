"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DEVELOPMENT_TWEET_IDS } from "@/lib/development-tweets";
import type { TweetData } from "@/lib/tweet-service";
import { TweetList } from "./tweet-list";

interface TweetFeedProps {
	tweets: TweetData[];
	showActions?: boolean;
}

export function TweetFeed({ tweets, showActions = true }: TweetFeedProps) {
	const [showDevTweets, setShowDevTweets] = useState(false);
	const [countdown, setCountdown] = useState(5);
	const [isChecking, setIsChecking] = useState(false);
	const router = useRouter();
	const lastUpdatedRef = useRef<number | null>(null);

	// Poll for updates every 5 seconds
	useEffect(() => {
		console.log("[TweetFeed] 🚀 Initializing auto-refresh polling (5s interval)");

		const checkForUpdates = async () => {
			const checkStartTime = Date.now();
			console.log(
				`[TweetFeed] 🔍 Starting update check at ${new Date(checkStartTime).toLocaleTimeString()}`,
			);

			setIsChecking(true);
			setCountdown(5);

			try {
				const response = await fetch("/api/tweets/check");

				if (!response.ok) {
					console.warn(
						`[TweetFeed] ⚠️ Check API returned ${response.status}: ${response.statusText}`,
					);
					return;
				}

				const data = await response.json();
				const serverLastUpdated = data.lastUpdated;

				console.log("[TweetFeed] 📊 Response data:", {
					serverLastUpdated,
					serverTimestamp: new Date(serverLastUpdated).toLocaleString(),
					apiTimestamp: data.timestamp,
					responseTime: `${Date.now() - checkStartTime}ms`,
				});

				// Initialize on first check
				if (lastUpdatedRef.current === null) {
					console.log(
						`[TweetFeed] 🎯 First check - initializing reference timestamp: ${serverLastUpdated}`,
					);
					lastUpdatedRef.current = serverLastUpdated;
					return;
				}

				// If timestamp changed, refresh the page data
				if (serverLastUpdated > lastUpdatedRef.current) {
					console.log("[TweetFeed] ✨ NEW TWEETS DETECTED!");
					console.log("[TweetFeed] 📈 Comparison:", {
						previous: lastUpdatedRef.current,
						previousTime: new Date(lastUpdatedRef.current).toLocaleString(),
						current: serverLastUpdated,
						currentTime: new Date(serverLastUpdated).toLocaleString(),
						difference: `${serverLastUpdated - lastUpdatedRef.current}ms`,
					});
					console.log("[TweetFeed] 🔄 Triggering router.refresh()...");

					lastUpdatedRef.current = serverLastUpdated;
					router.refresh();
				} else {
					console.log("[TweetFeed] ✅ No updates - timestamps match", {
						timestamp: lastUpdatedRef.current,
						time: new Date(lastUpdatedRef.current).toLocaleString(),
					});
				}
			} catch (error) {
				console.error("[TweetFeed] ❌ Failed to check for updates:", error);
				console.error("[TweetFeed] Error details:", {
					message: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
				});
			} finally {
				setIsChecking(false);
				console.log(
					`[TweetFeed] ⏱️ Check completed in ${Date.now() - checkStartTime}ms\n`,
				);
			}
		};

		// Check immediately on mount
		console.log("[TweetFeed] 🏃 Running initial check...");
		checkForUpdates();

		// Set up polling interval (5 seconds)
		console.log("[TweetFeed] ⏰ Setting up 5-second polling interval");
		const interval = setInterval(checkForUpdates, 5000);

		// Cleanup on unmount
		return () => {
			console.log("[TweetFeed] 🛑 Cleaning up polling interval");
			clearInterval(interval);
		};
	}, [router]);

	// Countdown timer effect
	useEffect(() => {
		const timer = setInterval(() => {
			setCountdown((prev) => {
				if (prev <= 1) return 5;
				return prev - 1;
			});
		}, 1000);

		return () => clearInterval(timer);
	}, []);

	// If we're showing dev tweets and there are no real tweets, create dev tweet data
	const displayTweets =
		tweets.length === 0 && showDevTweets
			? DEVELOPMENT_TWEET_IDS.map((id) => ({
					id,
					type: "tweet" as const,
					submittedBy: "dev",
				}))
			: tweets;

	return (
		<div className="space-y-4">
			{/* Auto-refresh countdown indicator */}
			<div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
				<div className="flex items-center gap-2">
					<div
						className={`h-2 w-2 rounded-full ${
							isChecking ? "bg-green-500 animate-pulse" : "bg-gray-400"
						}`}
					/>
					<span>
						{isChecking
							? "Checking for new tweets..."
							: `Next check in ${countdown}s`}
					</span>
				</div>
			</div>

			<TweetList
				tweets={displayTweets}
				showActions={showActions}
				isEmpty={tweets.length === 0}
				showDevTweets={showDevTweets}
				onToggleDevTweets={() => setShowDevTweets(!showDevTweets)}
			/>
		</div>
	);
}
