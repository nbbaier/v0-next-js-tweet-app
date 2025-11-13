"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TweetData } from "@/lib/tweet-service";
import { TweetList } from "./tweet-list";

interface FilterableTweetFeedProps {
	tweets: TweetData[];
	showActions?: boolean;
}

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
	const [tweets, setTweets] = useState<TweetData[]>(initialTweets);
	const router = useRouter();

	// Handle optimistic tweet seen status update
	const handleToggleSeen = useCallback(
		async (tweetId: string, currentSeenStatus: boolean) => {
			// Optimistically update the UI
			setTweets((prevTweets) =>
				prevTweets.map((tweet) =>
					tweet.id === tweetId ? { ...tweet, seen: !currentSeenStatus } : tweet,
				),
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

				setTimeout(() => {
					router.refresh();
				}, 1000);
			} catch (error) {
				setTweets((prevTweets) =>
					prevTweets.map((tweet) =>
						tweet.id === tweetId
							? { ...tweet, seen: currentSeenStatus }
							: tweet,
					),
				);
				throw error;
			}
		},
		[router],
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

	return (
		<div className="flex flex-col w-full">
			{unseenCounts.total > 0 && (
				<div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b py-3 px-4">
					<div className="mx-auto max-w-[550px] flex flex-wrap gap-2">
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
