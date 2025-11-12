"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { TweetData } from "@/lib/tweet-service";
import { TweetList } from "./tweet-list";

interface FilterableTweetFeedProps {
	tweets: TweetData[];
	showActions?: boolean;
}

export function FilterableTweetFeed({
	tweets,
	showActions = true,
}: FilterableTweetFeedProps) {
	const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

	// Calculate unseen tweets per person
	const unseenCounts = useMemo(() => {
		return tweets.reduce(
			(acc, tweet) => {
				// Only count if the tweet is explicitly marked as unseen (seen !== true)
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
		<div className="w-full flex flex-col">
			{/* Sticky filter badges */}
			{unseenCounts.total > 0 && (
				<div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b py-3 px-4">
					<div className="mx-auto max-w-[550px] flex flex-wrap gap-2">
						{/* All badge */}
						<button
							type="button"
							onClick={() => setSelectedFilter(null)}
							className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded-md"
						>
							<Badge
								variant={selectedFilter === null ? "default" : "outline"}
								className="cursor-pointer hover:bg-primary/90 text-base py-2 px-4"
							>
								<span className="font-semibold mr-2">All</span>
								<span className="bg-background/90 text-foreground rounded-full px-2 py-0.5 text-sm font-bold">
									{unseenCounts.total}
								</span>
							</Badge>
						</button>

						{/* Individual submitter badges */}
						{peopleWithUnseen.map(([person, count]) => (
							<button
								key={person}
								type="button"
								onClick={() => setSelectedFilter(person)}
								className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary rounded-md"
							>
								<Badge
									variant={selectedFilter === person ? "default" : "outline"}
									className="cursor-pointer hover:bg-primary/90 text-base py-2 px-4"
								>
									<span className="font-semibold mr-2">{person}</span>
									<span className="bg-background/90 text-foreground rounded-full px-2 py-0.5 text-sm font-bold">
										{count}
									</span>
								</Badge>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Tweet list */}
			<div className="flex-1 w-full py-6 px-4">
				<TweetList tweets={filteredTweets} showActions={showActions} />
			</div>
		</div>
	);
}
