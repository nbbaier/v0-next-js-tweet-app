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
		const checkForUpdates = async () => {
			setIsChecking(true);
			setCountdown(5);
			try {
				const response = await fetch("/api/tweets/check");
				if (!response.ok) return;

				const data = await response.json();
				const serverLastUpdated = data.lastUpdated;

				// Initialize on first check
				if (lastUpdatedRef.current === null) {
					lastUpdatedRef.current = serverLastUpdated;
					return;
				}

				// If timestamp changed, refresh the page data
				if (serverLastUpdated > lastUpdatedRef.current) {
					console.log("[TweetFeed] New tweets detected, refreshing feed...");
					lastUpdatedRef.current = serverLastUpdated;
					router.refresh();
				}
			} catch (error) {
				console.error("[TweetFeed] Failed to check for updates:", error);
			} finally {
				setIsChecking(false);
			}
		};

		// Check immediately on mount
		checkForUpdates();

		// Set up polling interval (5 seconds)
		const interval = setInterval(checkForUpdates, 5000);

		// Cleanup on unmount
		return () => clearInterval(interval);
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
