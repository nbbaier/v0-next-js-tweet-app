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
  showActions?: boolean;
  tweets: TweetData[];
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
    <Badge
      className="h-7"
      render={
        <Button
          className="rounded-lg hover:text-primary-foreground"
          onClick={onClick}
          size="sm"
        />
      }
      variant={variant}
    >
      <span className="font-medium text-xs">{label}</span>
      {!withoutCount && <span className="font-bold text-xs">{count}</span>}
    </Badge>
  );
}

function FilterBadgesSection({
  showHideSeen,
  currentCounts,
  currentPeople,
  hasFeedTweets,
  selectedFilter,
  hideSeenTweets,
  onSelectFilter,
  onToggleHideSeen,
}: {
  showHideSeen: boolean;
  currentCounts: Record<string, number>;
  currentPeople: [string, number][];
  hasFeedTweets: boolean;
  selectedFilter: string | null;
  hideSeenTweets: boolean;
  onSelectFilter: (filter: string | null) => void;
  onToggleHideSeen: () => void;
}) {
  const showFiltersAndToggle =
    showHideSeen && (currentCounts.total > 0 || hasFeedTweets);

  if (showFiltersAndToggle) {
    return (
      <>
        <FilterBadge
          count={currentCounts.total}
          label="All"
          onClick={() => onSelectFilter(null)}
          variant={selectedFilter === null ? "default" : "secondary"}
        />

        {currentPeople.map(([person, count]) => (
          <FilterBadge
            count={count}
            key={person}
            label={person}
            onClick={() => onSelectFilter(person)}
            variant={selectedFilter === person ? "default" : "secondary"}
          />
        ))}

        <FilterBadge
          count={0}
          label={hideSeenTweets ? "Show All" : "Hide Seen"}
          onClick={onToggleHideSeen}
          variant={hideSeenTweets ? "default" : "secondary"}
          withoutCount={true}
        />
      </>
    );
  }

  if (showHideSeen) {
    return (
      <FilterBadge
        count={0}
        label={hideSeenTweets ? "Show Seen" : "Hide Seen"}
        onClick={onToggleHideSeen}
        variant={hideSeenTweets ? "default" : "secondary"}
        withoutCount={true}
      />
    );
  }

  return (
    <>
      <FilterBadge
        count={currentCounts.total}
        label="All"
        onClick={() => onSelectFilter(null)}
        variant={selectedFilter === null ? "default" : "secondary"}
      />

      {currentPeople.map(([person, count]) => (
        <FilterBadge
          count={count}
          key={person}
          label={person}
          onClick={() => onSelectFilter(person)}
          variant={selectedFilter === person ? "default" : "secondary"}
        />
      ))}
    </>
  );
}

function useTweetActions(
  setTweets: (updater: (prev: TweetData[]) => TweetData[]) => void
) {
  const handleToggleSeen = useCallback(
    async (tweetId: string, currentSeenStatus: boolean) => {
      setTweets((prev) =>
        prev.map((t) =>
          t.id === tweetId ? { ...t, seen: !currentSeenStatus } : t
        )
      );

      try {
        const storedSecret =
          typeof window === "undefined"
            ? null
            : localStorage.getItem("tweet_api_secret");

        const response = await fetch(`/api/tweets/${tweetId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(storedSecret ? { "x-api-secret": storedSecret } : {}),
          },
          body: JSON.stringify({ seen: !currentSeenStatus }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update seen status");
        }
      } catch (error) {
        setTweets((prev) =>
          prev.map((t) =>
            t.id === tweetId ? { ...t, seen: currentSeenStatus } : t
          )
        );
        console.error("Failed to update seen status:", error);
        throw error;
      }
    },
    [setTweets]
  );

  const handleDelete = useCallback(
    async (tweetId: string) => {
      const storedSecret =
        typeof window === "undefined"
          ? null
          : localStorage.getItem("tweet_api_secret");

      if (!storedSecret) {
        throw new Error(
          "No API secret found. Please set it in the form above."
        );
      }

      let removedTweet: TweetData | undefined;
      let removedIndex = -1;
      setTweets((prev) => {
        removedIndex = prev.findIndex((t) => t.id === tweetId);
        if (removedIndex !== -1) {
          removedTweet = prev[removedIndex];
        }
        return prev.filter((t) => t.id !== tweetId);
      });

      try {
        const response = await fetch(`/api/tweets/${tweetId}`, {
          method: "DELETE",
          headers: { "x-api-secret": storedSecret },
        });

        if (!response.ok) {
          if (removedTweet) {
            const tweet = removedTweet;
            setTweets((prev) => {
              const next = [...prev];
              next.splice(Math.min(removedIndex, next.length), 0, tweet);
              return next;
            });
          }
          const data = await response.json();
          throw new Error(data.error || "Failed to delete tweet");
        }
      } catch (error) {
        if (removedTweet) {
          const tweet = removedTweet;
          setTweets((prev) => {
            if (prev.some((t) => t.id === tweetId)) {
              return prev;
            }
            const next = [...prev];
            next.splice(Math.min(removedIndex, next.length), 0, tweet);
            return next;
          });
        }
        console.error("Failed to delete tweet:", error);
        throw error;
      }
    },
    [setTweets]
  );

  const handleToggleSaved = useCallback(
    async (tweetId: string, currentSavedStatus: boolean) => {
      setTweets((prev) =>
        prev.map((t) =>
          t.id === tweetId ? { ...t, saved: !currentSavedStatus } : t
        )
      );

      try {
        const storedSecret =
          typeof window === "undefined"
            ? null
            : localStorage.getItem("tweet_api_secret");

        const response = await fetch(`/api/tweets/${tweetId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(storedSecret ? { "x-api-secret": storedSecret } : {}),
          },
          body: JSON.stringify({ saved: !currentSavedStatus }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update saved status");
        }
      } catch (error) {
        setTweets((prev) =>
          prev.map((t) =>
            t.id === tweetId ? { ...t, saved: currentSavedStatus } : t
          )
        );
        console.error("Failed to update saved status:", error);
        throw error;
      }
    },
    [setTweets]
  );

  return { handleToggleSeen, handleDelete, handleToggleSaved };
}

function countByPoster(
  tweets: TweetData[],
  filterUnseen: boolean
): Record<string, number> {
  return tweets.reduce(
    (acc, tweet) => {
      if (filterUnseen && tweet.seen === true) {
        return acc;
      }
      const posters =
        tweet.submittedBy.length > 0 ? tweet.submittedBy : ["Unknown"];
      for (const poster of posters) {
        acc[poster] = (acc[poster] || 0) + 1;
      }
      acc.total = (acc.total || 0) + 1;
      return acc;
    },
    { total: 0 } as Record<string, number>
  );
}

function getPeopleFromCounts(
  counts: Record<string, number>
): [string, number][] {
  return Object.entries(counts)
    .filter(([key, count]) => key !== "total" && count > 0)
    .sort(([a], [b]) => a.localeCompare(b));
}

export function FilterableTweetFeed({
  tweets: initialTweets,
  showActions = true,
}: FilterableTweetFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [completionMessage, setCompletionMessage] = useState<string>("");
  const prevUnseenCountRef = useRef<number | null>(null);
  const activeTab: "feed" | "saved" =
    searchParams.get("tab") === "saved" ? "saved" : "feed";
  const selectedFilter = searchParams.get("filter");
  const hideSeenTweets = searchParams.get("hideSeen") === "true";

  const updateUrl = useCallback(
    (
      nextFilter: string | null,
      nextHideSeen: boolean,
      nextTab?: "feed" | "saved"
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
    [pathname, router, searchParams, activeTab]
  );

  const handleSelectFilter = useCallback(
    (filter: string | null) => {
      updateUrl(filter, hideSeenTweets);
    },
    [hideSeenTweets, updateUrl]
  );

  const handleTabChange = useCallback(
    (tab: "feed" | "saved") => {
      updateUrl(null, hideSeenTweets, tab);
    },
    [hideSeenTweets, updateUrl]
  );

  const handleToggleHideSeen = useCallback(() => {
    updateUrl(selectedFilter, !hideSeenTweets);
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

  const { handleToggleSeen, handleDelete, handleToggleSaved } =
    useTweetActions(setTweets);

  // Select a random completion message when all tweets are seen
  useEffect(() => {
    const allSeen =
      tweets.length > 0 && tweets.every((tweet) => tweet.seen === true);
    if (allSeen && !completionMessage) {
      const randomIndex = Math.floor(
        Math.random() * COMPLETION_MESSAGES.length
      );
      setCompletionMessage(COMPLETION_MESSAGES[randomIndex]);
    } else if (!allSeen && completionMessage) {
      setCompletionMessage("");
    }
  }, [tweets, completionMessage]);

  // Filter out saved tweets for feed view
  const feedTweets = useMemo(
    () => tweets.filter((tweet) => tweet.saved !== true),
    [tweets]
  );

  // Calculate unseen tweets per person (for feed view, only non-saved tweets)
  const unseenCounts = useMemo(
    () => countByPoster(feedTweets, true),
    [feedTweets]
  );

  // Calculate counts for saved view
  const savedTweets = useMemo(
    () => tweets.filter((tweet) => tweet.saved === true),
    [tweets]
  );

  const savedCounts = useMemo(
    () => countByPoster(savedTweets, false),
    [savedTweets]
  );

  // Auto-hide seen tweets when unread count transitions to zero or on initial load with no unseen
  useEffect(() => {
    const prevCount = prevUnseenCountRef.current;
    const currentCount = unseenCounts.total;

    const shouldAutoHide =
      currentCount === 0 &&
      feedTweets.length > 0 &&
      (prevCount === null || prevCount > 0) &&
      !hideSeenTweets;

    if (shouldAutoHide) {
      updateUrl(selectedFilter, true);
    }

    prevUnseenCountRef.current = currentCount;
  }, [
    hideSeenTweets,
    selectedFilter,
    feedTweets.length,
    unseenCounts.total,
    updateUrl,
  ]);

  // Sort feed tweets: unread first, then seen
  const sortedFeedTweets = useMemo(
    () =>
      [...feedTweets].sort((a, b) => {
        const aUnseen = a.seen !== true;
        const bUnseen = b.seen !== true;

        if (aUnseen && !bUnseen) {
          return -1;
        }
        if (!aUnseen && bUnseen) {
          return 1;
        }
        return 0;
      }),
    [feedTweets]
  );

  // Filter feed tweets based on selected filter and hide seen toggle
  const filteredTweets = useMemo(() => {
    let result = sortedFeedTweets;

    if (selectedFilter) {
      result = result.filter(
        (tweet) =>
          tweet.submittedBy.includes(selectedFilter) ||
          (tweet.submittedBy.length === 0 && selectedFilter === "Unknown")
      );
    }

    if (hideSeenTweets) {
      result = result.filter((tweet) => tweet.seen !== true);
    }

    return result;
  }, [sortedFeedTweets, selectedFilter, hideSeenTweets]);

  // Filter saved tweets based on selected filter
  const filteredSavedTweets = useMemo(() => {
    if (!selectedFilter) {
      return savedTweets;
    }
    return savedTweets.filter(
      (tweet) =>
        tweet.submittedBy.includes(selectedFilter) ||
        (tweet.submittedBy.length === 0 && selectedFilter === "Unknown")
    );
  }, [savedTweets, selectedFilter]);

  const peopleWithUnseen = useMemo(
    () => getPeopleFromCounts(unseenCounts),
    [unseenCounts]
  );

  const peopleWithSaved = useMemo(
    () => getPeopleFromCounts(savedCounts),
    [savedCounts]
  );

  const allTweetsSeen = unseenCounts.total === 0 && feedTweets.length > 0;
  const showCompletionMessage =
    allTweetsSeen && hideSeenTweets && activeTab === "feed";

  const currentCounts = activeTab === "feed" ? unseenCounts : savedCounts;
  const currentPeople =
    activeTab === "feed" ? peopleWithUnseen : peopleWithSaved;
  const showHideSeen = activeTab === "feed";

  return (
    <div className="flex w-full flex-col">
      <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80">
        {/* Tabs and filter badges in single row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab switcher */}
          <Button
            className="text-sm"
            onClick={() => handleTabChange("feed")}
            size="sm"
            variant={activeTab === "feed" ? "default" : "ghost"}
          >
            Feed
          </Button>
          <Button
            className="text-sm"
            onClick={() => handleTabChange("saved")}
            size="sm"
            variant={activeTab === "saved" ? "default" : "ghost"}
          >
            Saved{savedTweets.length > 0 && ` (${savedTweets.length})`}
          </Button>

          {/* Filter badges */}
          <FilterBadgesSection
            currentCounts={currentCounts}
            currentPeople={currentPeople}
            hasFeedTweets={feedTweets.length > 0}
            hideSeenTweets={hideSeenTweets}
            onSelectFilter={handleSelectFilter}
            onToggleHideSeen={handleToggleHideSeen}
            selectedFilter={selectedFilter}
            showHideSeen={showHideSeen}
          />
        </div>
        <div className="absolute right-[calc(-50vw+50%)] bottom-0 left-[calc(-50vw+50%)] w-screen">
          <Separator />
        </div>
      </div>

      {/* Tweet list */}
      <div className="w-full flex-1 py-6">
        {activeTab === "feed" ? (
          <TweetList
            completionMessage={
              showCompletionMessage ? completionMessage : undefined
            }
            onDelete={handleDelete}
            onToggleSaved={handleToggleSaved}
            onToggleSeen={handleToggleSeen}
            resetKey={`feed:${selectedFilter ?? "all"}:${hideSeenTweets}`}
            showActions={showActions}
            tweets={filteredTweets}
          />
        ) : (
          <TweetList
            isEmpty={filteredSavedTweets.length === 0}
            onDelete={handleDelete}
            onToggleSaved={handleToggleSaved}
            resetKey={`saved:${selectedFilter ?? "all"}`}
            showActions={showActions}
            tweets={filteredSavedTweets}
          />
        )}
      </div>
    </div>
  );
}
