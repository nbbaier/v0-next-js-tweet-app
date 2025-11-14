"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TweetData } from "@/lib/tweet-service";
import { TweetList } from "./tweet-list";
import { useRealtimeTweets } from "@/hooks/use-realtime-tweets";

interface FilterableTweetFeedProps {
	tweets: TweetData[];
	showActions?: boolean;
}

// Fun completion messages to display when all tweets are seen
const COMPLETION_MESSAGES = [
	"You're all caught up! Time to touch some grass. 🌱",
	"Inbox zero vibes! You've conquered the feed!",
	"Nothing left to see here. Maybe go make a sandwich?",
	"Feed fully digested! Your brain thanks you.",
	"All done! Now you can finally do that thing you've been avoiding.",
	"Achievement unlocked: Tweet Master! 🏆",
	"The feed is clean. The timeline is yours. What now?",
	"You've reached the end of the internet (this part of it, anyway).",
	"Congratulations! You've successfully procrastinated through all tweets.",
	"Feed: cleared. Conscience: clear. Couch: calling your name.",
	"No more tweets! Time to create your own content maybe?",
	"You've seen everything. The void stares back... lovingly.",
];

function FilterBadge({
	variant,
	label,
	count,
	withoutCount = false,
	onClick,
}: {
	variant: "default" | "secondary";
	label: string;
	count: number;
	withoutCount?: boolean;
	onClick: () => void;
}) {
	return (
		<Badge asChild variant={variant}>
			<Button
				size="sm"
				className="rounded-lg hover:text-primary-foreground"
				onClick={onClick}
			>
				<span className="text-xs font-medium">{label}</span>
				{!withoutCount && <span className="text-xs font-bold">{count}</span>}
			</Button>
		</Badge>
	);
}

export function FilterableTweetFeed({
	tweets: initialTweets,
	showActions = true,
}: FilterableTweetFeedProps) {
	const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
	const [hideSeenTweets, setHideSeenTweets] = useState(false);
	const router = useRouter();

	// Use real-time tweets hook
	const { tweets } = useRealtimeTweets(initialTweets, {
		enabled: true,
		onError: (error) => {
			console.error("[FilterableTweetFeed] Real-time error:", error);
		},
		onConnected: () => {
			console.log("[FilterableTweetFeed] Connected to real-time updates");
		},
		onDisconnected: () => {
			console.log("[FilterableTweetFeed] Disconnected from real-time updates");
		},
	});

	// Handle tweet seen status update
	const [tweets, setTweets] = useState<TweetData[]>(initialTweets);
	const [completionMessage, setCompletionMessage] = useState<string>("");
	const router = useRouter();

	// Select a random completion message when all tweets are seen
	useEffect(() => {
		const allSeen =
			tweets.length > 0 && tweets.every((tweet) => tweet.seen === true);
		if (allSeen && !completionMessage) {
			const randomIndex = Math.floor(
				Math.random() * COMPLETION_MESSAGES.length,
			);
			setCompletionMessage(COMPLETION_MESSAGES[randomIndex]);
		} else if (!allSeen && completionMessage) {
			setCompletionMessage("");
		}
	}, [tweets, completionMessage]);

	// Handle optimistic tweet seen status update
	const handleToggleSeen = useCallback(
		async (tweetId: string, currentSeenStatus: boolean) => {
			try {
				const response = await fetch(`/api/tweets/${tweetId}`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ seen: !currentSeenStatus }),
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.error || "Failed to update seen status");
				}

				// Real-time updates will handle the UI update via SSE
				// But also trigger a refresh as backup
				setTimeout(() => {
					router.refresh();
				}, 1000);
			} catch (error) {
				console.error("Failed to update seen status:", error);
				throw error;
			}
		},
		[router],
	);

	// Handle optimistic tweet deletion
	const handleDelete = useCallback(
		async (tweetId: string) => {
			// Get the API secret from localStorage
			const storedSecret =
				typeof window !== "undefined"
					? localStorage.getItem("tweet_api_secret")
					: null;

			if (!storedSecret) {
				throw new Error(
					"No API secret found. Please set it in the form above.",
				);
			}

			// Store the tweet for potential rollback
			const deletedTweet = tweets.find((tweet) => tweet.id === tweetId);

			// Optimistically remove the tweet from the UI
			setTweets((prevTweets) =>
				prevTweets.filter((tweet) => tweet.id !== tweetId),
			);

			try {
				const response = await fetch(`/api/tweets/${tweetId}`, {
					method: "DELETE",
					headers: {
						"x-api-secret": storedSecret,
					},
				});

				if (!response.ok) {
					const data = await response.json();
					throw new Error(data.error || "Failed to delete tweet");
				}

				// Refresh after a short delay to ensure server state is updated
				setTimeout(() => {
					router.refresh();
				}, 1000);
			} catch (error) {
				// Rollback on error - add the tweet back
				if (deletedTweet) {
					setTweets((prevTweets) => [...prevTweets, deletedTweet]);
				}
				throw error;
			}
		},
		[tweets, router],
	);

	// Calculate unseen tweets per person
	const unseenCounts = useMemo(() => {
		return tweets.reduce(
			(acc, tweet) => {
				if (tweet.seen !== true) {
					// Count this tweet for each poster
					const posters =
						tweet.submittedBy.length > 0 ? tweet.submittedBy : ["Unknown"];
					for (const poster of posters) {
						acc[poster] = (acc[poster] || 0) + 1;
					}
					acc.total = (acc.total || 0) + 1;
				}
				return acc;
			},
			{ total: 0 } as Record<string, number>,
		);
	}, [tweets]);

	// Get list of people with unseen tweets
	const peopleWithUnseen = useMemo(() => {
		return Object.entries(unseenCounts)
			.filter(([key, count]) => key !== "total" && count > 0)
			.sort(([a], [b]) => a.localeCompare(b));
	}, [unseenCounts]);

	// Sort tweets: unread first, then seen
	const sortedTweets = useMemo(() => {
		return [...tweets].sort((a, b) => {
			// Unread tweets (seen !== true) come first
			const aUnseen = a.seen !== true;
			const bUnseen = b.seen !== true;

			if (aUnseen && !bUnseen) return -1;
			if (!aUnseen && bUnseen) return 1;
			return 0;
		});
	}, [tweets]);

	// Filter tweets based on selected filter and hide seen toggle
	const filteredTweets = useMemo(() => {
		let result = sortedTweets;

		// Filter by selected person
		if (selectedFilter) {
			result = result.filter(
				(tweet) =>
					tweet.submittedBy.includes(selectedFilter) ||
					(tweet.submittedBy.length === 0 && selectedFilter === "Unknown"),
			);
		}

		// Filter out seen tweets if hideSeenTweets is enabled
		if (hideSeenTweets) {
			result = result.filter((tweet) => tweet.seen !== true);
		}

		return result;
	}, [sortedTweets, selectedFilter, hideSeenTweets]);

	const allTweetsSeen = unseenCounts.total === 0 && tweets.length > 0;
	const showCompletionMessage = allTweetsSeen && hideSeenTweets;

	return (
		<div className="flex flex-col w-full">
			<div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b py-3 -mx-4 px-4">
				<div className="flex flex-wrap gap-2">
					{unseenCounts.total > 0 ? (
						<>
							<FilterBadge
								variant={selectedFilter === null ? "default" : "secondary"}
								label="All"
								count={unseenCounts.total}
								onClick={() => setSelectedFilter(null)}
							/>

							{peopleWithUnseen.map(([person, count]) => (
								<FilterBadge
									key={person}
									variant={selectedFilter === person ? "default" : "secondary"}
									label={person}
									count={count}
									onClick={() => setSelectedFilter(person)}
								/>
							))}

							<FilterBadge
								variant={hideSeenTweets ? "default" : "secondary"}
								label={hideSeenTweets ? "Show All" : "Hide Seen"}
								count={0}
								withoutCount={true}
								onClick={() => setHideSeenTweets(!hideSeenTweets)}
							/>
						</>
					) : (
						<FilterBadge
							variant={hideSeenTweets ? "default" : "secondary"}
							label={hideSeenTweets ? "Show Seen" : "Hide Seen"}
							count={0}
							withoutCount={true}
							onClick={() => setHideSeenTweets(!hideSeenTweets)}
						/>
					)}
				</div>
			</div>

			{/* Tweet list */}
			<div className="flex-1 py-6 w-full">
				<TweetList
					tweets={filteredTweets}
					showActions={showActions}
					onToggleSeen={handleToggleSeen}
					completionMessage={
						showCompletionMessage ? completionMessage : undefined
					}
					onDelete={handleDelete}
				/>
			</div>
		</div>
	);
}
