"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useRealtimeTweets } from "@/hooks/use-realtime-tweets";
import type { TweetData } from "@/lib/tweet-service";
import { TweetList } from "./tweet-list";

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
	"You've seen everything. The void stares back… lovingly.",
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
	const router = useRouter();
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const [activeTab, setActiveTab] = useState<"feed" | "saved">(() =>
		searchParams.get("tab") === "saved" ? "saved" : "feed",
	);
	const [selectedFilter, setSelectedFilter] = useState<string | null>(() =>
		searchParams.get("filter"),
	);
	const [hideSeenTweets, setHideSeenTweets] = useState(() => {
		return searchParams.get("hideSeen") === "true";
	});

	const [completionMessage, setCompletionMessage] = useState<string>("");
	const prevUnseenCountRef = useRef<number | null>(null);
	const filterParam = searchParams.get("filter");
	const hideSeenParam = searchParams.get("hideSeen") === "true";
	const tabParam = searchParams.get("tab") === "saved" ? "saved" : "feed";

	const updateUrl = useCallback(
		(
			nextFilter: string | null,
			nextHideSeen: boolean,
			nextTab?: "feed" | "saved",
		) => {
			const params = new URLSearchParams(searchParams);

			if (nextFilter) {
				params.set("filter", nextFilter);
			} else {
				params.delete("filter");
			}

			if (nextHideSeen) {
				params.set("hideSeen", "true");
			} else {
				params.delete("hideSeen");
			}

			const tab = nextTab ?? activeTab;
			if (tab === "saved") {
				params.set("tab", "saved");
			} else {
				params.delete("tab");
			}

			const queryString = params.toString();
			router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
				scroll: false,
			});
		},
		[pathname, router, searchParams, activeTab],
	);

	useEffect(() => {
		if (filterParam !== selectedFilter) {
			setSelectedFilter(filterParam);
		}

		if (hideSeenParam !== hideSeenTweets) {
			setHideSeenTweets(hideSeenParam);
		}

		if (tabParam !== activeTab) {
			setActiveTab(tabParam);
		}
	}, [
		filterParam,
		hideSeenParam,
		tabParam,
		selectedFilter,
		hideSeenTweets,
		activeTab,
	]);

	const handleSelectFilter = useCallback(
		(filter: string | null) => {
			setSelectedFilter(filter);
			updateUrl(filter, hideSeenTweets);
		},
		[hideSeenTweets, updateUrl],
	);

	const handleTabChange = useCallback(
		(tab: "feed" | "saved") => {
			setActiveTab(tab);
			setSelectedFilter(null);
			updateUrl(null, hideSeenTweets, tab);
		},
		[hideSeenTweets, updateUrl],
	);

	const handleToggleHideSeen = useCallback(() => {
		const nextHideSeen = !hideSeenTweets;
		setHideSeenTweets(nextHideSeen);
		updateUrl(selectedFilter, nextHideSeen);
	}, [hideSeenTweets, selectedFilter, updateUrl]);

	// Use real-time tweets hook
	const { tweets, setTweets } = useRealtimeTweets(initialTweets, {
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
			// Optimistic update - update state immediately
			setTweets((prev) =>
				prev.map((t) =>
					t.id === tweetId ? { ...t, seen: !currentSeenStatus } : t,
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
					// Revert on failure
					setTweets((prev) =>
						prev.map((t) =>
							t.id === tweetId ? { ...t, seen: currentSeenStatus } : t,
						),
					);
					const data = await response.json();
					throw new Error(data.error || "Failed to update seen status");
				}
			} catch (error) {
				console.error("Failed to update seen status:", error);
				throw error;
			}
		},
		[setTweets],
	);

	// Handle tweet deletion
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

			// Optimistic update - remove tweet immediately
			const snapshot = tweets;
			setTweets((prev) => prev.filter((t) => t.id !== tweetId));

			try {
				const response = await fetch(`/api/tweets/${tweetId}`, {
					method: "DELETE",
					headers: {
						"x-api-secret": storedSecret,
					},
				});

				if (!response.ok) {
					// Revert on failure
					setTweets(snapshot);
					const data = await response.json();
					throw new Error(data.error || "Failed to delete tweet");
				}
			} catch (error) {
				console.error("Failed to delete tweet:", error);
				throw error;
			}
		},
		[tweets, setTweets],
	);

	// Handle tweet save/unsave
	const handleToggleSaved = useCallback(
		async (tweetId: string, currentSavedStatus: boolean) => {
			// Optimistic update - toggle saved status immediately
			setTweets((prev) =>
				prev.map((t) =>
					t.id === tweetId ? { ...t, saved: !currentSavedStatus } : t,
				),
			);

			try {
				const response = await fetch(`/api/tweets/${tweetId}`, {
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ saved: !currentSavedStatus }),
				});

				if (!response.ok) {
					// Revert on failure
					setTweets((prev) =>
						prev.map((t) =>
							t.id === tweetId ? { ...t, saved: currentSavedStatus } : t,
						),
					);
					const data = await response.json();
					throw new Error(data.error || "Failed to update saved status");
				}
			} catch (error) {
				console.error("Failed to update saved status:", error);
				throw error;
			}
		},
		[setTweets],
	);

	// Filter out saved tweets for feed view
	const feedTweets = useMemo(() => {
		return tweets.filter((tweet) => tweet.saved !== true);
	}, [tweets]);

	// Calculate unseen tweets per person (for feed view, only non-saved tweets)
	const unseenCounts = useMemo(() => {
		return feedTweets.reduce(
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
	}, [feedTweets]);

	// Calculate counts for saved view
	const savedTweets = useMemo(() => {
		return tweets.filter((tweet) => tweet.saved === true);
	}, [tweets]);

	const savedCounts = useMemo(() => {
		return savedTweets.reduce(
			(acc, tweet) => {
				// Count this tweet for each poster
				const posters =
					tweet.submittedBy.length > 0 ? tweet.submittedBy : ["Unknown"];
				for (const poster of posters) {
					acc[poster] = (acc[poster] || 0) + 1;
				}
				acc.total = (acc.total || 0) + 1;
				return acc;
			},
			{ total: 0 } as Record<string, number>,
		);
	}, [savedTweets]);

	// Auto-hide seen tweets when unread count transitions to zero or on initial load with no unseen
	useEffect(() => {
		const prevCount = prevUnseenCountRef.current;
		const currentCount = unseenCounts.total;

		// Auto-toggle in two cases:
		// 1. Initial page load with no unseen tweets (prevCount === null && currentCount === 0)
		// 2. Transition from having unseen tweets to zero (prevCount > 0 && currentCount === 0)
		if (
			currentCount === 0 &&
			feedTweets.length > 0 &&
			(prevCount === null || prevCount > 0) &&
			!hideSeenTweets
		) {
			setHideSeenTweets(true);
			updateUrl(selectedFilter, true);
		}

		// Update the ref with current count
		prevUnseenCountRef.current = currentCount;
	}, [
		hideSeenTweets,
		selectedFilter,
		feedTweets.length,
		unseenCounts.total,
		updateUrl,
	]);

	// Sort feed tweets: unread first, then seen
	const sortedFeedTweets = useMemo(() => {
		return [...feedTweets].sort((a, b) => {
			// Unread tweets (seen !== true) come first
			const aUnseen = a.seen !== true;
			const bUnseen = b.seen !== true;

			if (aUnseen && !bUnseen) return -1;
			if (!aUnseen && bUnseen) return 1;
			return 0;
		});
	}, [feedTweets]);

	// Filter feed tweets based on selected filter and hide seen toggle
	const filteredTweets = useMemo(() => {
		let result = sortedFeedTweets;

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
	}, [sortedFeedTweets, selectedFilter, hideSeenTweets]);

	// Filter saved tweets based on selected filter
	const filteredSavedTweets = useMemo(() => {
		let result = savedTweets;

		// Filter by selected person
		if (selectedFilter) {
			result = result.filter(
				(tweet) =>
					tweet.submittedBy.includes(selectedFilter) ||
					(tweet.submittedBy.length === 0 && selectedFilter === "Unknown"),
			);
		}

		return result;
	}, [savedTweets, selectedFilter]);

	// Get list of people with unseen tweets in feed
	const peopleWithUnseen = useMemo(() => {
		return Object.entries(unseenCounts)
			.filter(([key, count]) => key !== "total" && count > 0)
			.sort(([a], [b]) => a.localeCompare(b));
	}, [unseenCounts]);

	// Get list of people with saved tweets
	const peopleWithSaved = useMemo(() => {
		return Object.entries(savedCounts)
			.filter(([key, count]) => key !== "total" && count > 0)
			.sort(([a], [b]) => a.localeCompare(b));
	}, [savedCounts]);

	const allTweetsSeen = unseenCounts.total === 0 && feedTweets.length > 0;
	const showCompletionMessage =
		allTweetsSeen && hideSeenTweets && activeTab === "feed";

	// Get current counts and people based on active tab
	// Always show unseen counts for feed badges, regardless of hide-seen toggle
	const currentCounts = activeTab === "feed" ? unseenCounts : savedCounts;
	const currentPeople =
		activeTab === "feed" ? peopleWithUnseen : peopleWithSaved;
	const showHideSeen = activeTab === "feed";

	return (
		<div className="flex flex-col w-full">
			<div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 py-3 -mx-4 px-4">
				{/* Tabs and filter badges in single row */}
				<div className="flex flex-wrap gap-2 items-center">
					{/* Tab switcher */}
					<Button
						variant={activeTab === "feed" ? "default" : "ghost"}
						size="sm"
						onClick={() => handleTabChange("feed")}
						className="text-sm"
					>
						Feed
					</Button>
					<Button
						variant={activeTab === "saved" ? "default" : "ghost"}
						size="sm"
						onClick={() => handleTabChange("saved")}
						className="text-sm"
					>
						Saved{savedTweets.length > 0 && ` (${savedTweets.length})`}
					</Button>

					{/* Filter badges */}
					{showHideSeen && (currentCounts.total > 0 || feedTweets.length > 0) ? (
						<>
							<FilterBadge
								variant={selectedFilter === null ? "default" : "secondary"}
								label="All"
								count={currentCounts.total}
								onClick={() => handleSelectFilter(null)}
							/>

							{currentPeople.map(([person, count]) => (
								<FilterBadge
									key={person}
									variant={selectedFilter === person ? "default" : "secondary"}
									label={person}
									count={count}
									onClick={() => handleSelectFilter(person)}
								/>
							))}

							<FilterBadge
								variant={hideSeenTweets ? "default" : "secondary"}
								label={hideSeenTweets ? "Show All" : "Hide Seen"}
								count={0}
								withoutCount={true}
								onClick={handleToggleHideSeen}
							/>
						</>
					) : showHideSeen ? (
						<FilterBadge
							variant={hideSeenTweets ? "default" : "secondary"}
							label={hideSeenTweets ? "Show Seen" : "Hide Seen"}
							count={0}
							withoutCount={true}
							onClick={handleToggleHideSeen}
						/>
					) : (
						<>
							<FilterBadge
								variant={selectedFilter === null ? "default" : "secondary"}
								label="All"
								count={currentCounts.total}
								onClick={() => handleSelectFilter(null)}
							/>

							{currentPeople.map(([person, count]) => (
								<FilterBadge
									key={person}
									variant={selectedFilter === person ? "default" : "secondary"}
									label={person}
									count={count}
									onClick={() => handleSelectFilter(person)}
								/>
							))}
						</>
					)}
				</div>
				<div className="absolute left-[calc(-50vw+50%)] right-[calc(-50vw+50%)] bottom-0 w-screen">
					<Separator />
				</div>
			</div>

			{/* Tweet list */}
			<div className="flex-1 py-6 w-full">
				{activeTab === "feed" ? (
					<TweetList
						tweets={filteredTweets}
						showActions={showActions}
						onToggleSeen={handleToggleSeen}
						onToggleSaved={handleToggleSaved}
						completionMessage={
							showCompletionMessage ? completionMessage : undefined
						}
						onDelete={handleDelete}
					/>
				) : (
					<TweetList
						tweets={filteredSavedTweets}
						showActions={showActions}
						onToggleSaved={handleToggleSaved}
						onDelete={handleDelete}
						isEmpty={filteredSavedTweets.length === 0}
					/>
				)}
			</div>
		</div>
	);
}
