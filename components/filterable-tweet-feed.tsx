"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TweetData } from "@/lib/tweet-service";
import { TweetList } from "./tweet-list";

interface FilterableTweetFeedProps {
	tweets: TweetData[];
	showActions?: boolean;
}

export function FilterableTweetFeed({
	tweets: initialTweets,
	showActions = true,
}: FilterableTweetFeedProps) {
	const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
	const [tweets, setTweets] = useState<TweetData[]>(initialTweets);
	const router = useRouter();

	// Handle optimistic tweet seen status update
	const handleToggleSeen = useCallback(async (tweetId: string, currentSeenStatus: boolean) => {
		// Optimistically update the UI
		setTweets((prevTweets) =>
			prevTweets.map((tweet) =>
				tweet.id === tweetId ? { ...tweet, seen: !currentSeenStatus } : tweet
			)
		);

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

			// Delay refresh to allow animation to complete
			setTimeout(() => {
				router.refresh();
			}, 1000);
		} catch (error) {
			// Revert on error
			setTweets((prevTweets) =>
				prevTweets.map((tweet) =>
					tweet.id === tweetId ? { ...tweet, seen: currentSeenStatus } : tweet
				)
			);
			throw error;
		}
	}, [router]);

	// Calculate unseen tweets per person
	const unseenCounts = useMemo(() => {
		return tweets.reduce(
			(acc, tweet) => {
				if (tweet.seen !== true) {
					const submitter = tweet.submittedBy || "Unknown";
					acc[submitter] = (acc[submitter] || 0) + 1;
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

	// Filter tweets based on selected filter
	const filteredTweets = useMemo(() => {
		if (!selectedFilter) return sortedTweets;
		return sortedTweets.filter((tweet) => tweet.submittedBy === selectedFilter);
	}, [sortedTweets, selectedFilter]);

	return (
		<div className="flex flex-col w-full">
			{/* Sticky filter badges */}
			{unseenCounts.total > 0 && (
				<div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b py-3 px-4">
					<div className="mx-auto max-w-[550px] flex flex-wrap gap-2">
						{/* All badge */}
						<Badge
							asChild
							variant={selectedFilter === null ? "default" : "secondary"}
						>
							<Button
								size="sm"
								className="rounded-lg"
								onClick={() => setSelectedFilter(null)}
							>
								<span className="text-xs font-medium">All</span>
								<span className="text-xs font-bold text-primary-background">
									{unseenCounts.total}
								</span>
							</Button>
						</Badge>

						{/* Individual submitter badges */}
						{peopleWithUnseen.map(([person, count]) => (
							<Badge
								asChild
								key={person}
								variant={selectedFilter === person ? "default" : "secondary"}
							>
								<Button
									size="sm"
									className="rounded-lg"
									onClick={() => setSelectedFilter(person)}
								>
									<span className="text-xs font-medium">{person}</span>
									<span className="text-xs font-bold text-primary-background">
										{count}
									</span>
								</Button>
							</Badge>
						))}
					</div>
				</div>
			)}

			{/* Tweet list */}
			<div className="flex-1 px-4 py-6 w-full">
				<TweetList
					tweets={filteredTweets}
					showActions={showActions}
					onToggleSeen={handleToggleSeen}
				/>
			</div>
		</div>
	);
}
