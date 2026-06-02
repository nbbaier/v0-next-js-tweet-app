"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { EmbeddedTweet, Tweet } from "react-tweet";
import type { TweetData } from "@/lib/tweet-service";
import { Confetti } from "./confetti";
import { TweetWithActions } from "./tweet-with-actions";
import { Button } from "./ui/button";

// How many tweets to mount per page. The whole filtered list lives in memory
// (so filter counts stay accurate), but we only render embeds incrementally to
// keep initial paint fast when many tweets are saved.
const TWEETS_PER_PAGE = 10;

// Start fetching the next page before the sentinel is actually on screen so
// scrolling feels seamless.
const SENTINEL_ROOT_MARGIN = "800px 0px";

interface TweetListProps {
  tweets: TweetData[];
  showActions?: boolean;
  apiSecret?: string;
  isEmpty?: boolean;
  showDevTweets?: boolean;
  onToggleDevTweets?: () => void;
  onToggleSeen?: (tweetId: string, currentSeenStatus: boolean) => Promise<void>;
  onToggleSaved?: (
    tweetId: string,
    currentSavedStatus: boolean
  ) => Promise<void>;
  completionMessage?: string;
  onDelete?: (tweetId: string) => Promise<void>;
  // Changes to this value reset pagination back to the first page (e.g. when
  // the active tab or filter changes).
  resetKey?: string;
}

export function TweetList({
  tweets,
  showActions = true,
  apiSecret,
  isEmpty = false,
  showDevTweets = false,
  onToggleDevTweets,
  onToggleSeen,
  onToggleSaved,
  completionMessage,
  onDelete,
  resetKey,
}: TweetListProps) {
  const shouldReduceMotion = useReducedMotion();

  const [visibleCount, setVisibleCount] = useState(TWEETS_PER_PAGE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset to the first page whenever the filter/tab context changes. We key off
  // resetKey rather than the tweets array so realtime updates (which replace the
  // array reference) don't collapse the list back to page one.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey is the intended trigger
  useEffect(() => {
    setVisibleCount(TWEETS_PER_PAGE);
  }, [resetKey]);

  const visibleTweets = useMemo(
    () => tweets.slice(0, visibleCount),
    [tweets, visibleCount]
  );
  const hasMore = visibleCount < tweets.length;

  // Grow the visible window as the sentinel scrolls into view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resetKey intentionally refreshes the observer after pagination context changes
  useEffect(() => {
    if (!hasMore) {
      return;
    }
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) =>
            Math.min(count + TWEETS_PER_PAGE, tweets.length)
          );
        }
      },
      { rootMargin: SENTINEL_ROOT_MARGIN }
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore, resetKey, tweets.length]);

  // Show completion message when all tweets are seen and filtered out
  if (completionMessage) {
    return (
      <>
        <Confetti />
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="mb-4 text-6xl">🎉</div>
          <p className="max-w-md text-center font-medium text-xl">
            {completionMessage}
          </p>
        </div>
      </>
    );
  }

  if (isEmpty && tweets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-lg text-muted-foreground">No tweets to display</p>
        <p className="max-w-md text-center text-muted-foreground text-sm">
          Add your first tweet using the form above, or toggle development
          tweets to see some examples.
        </p>
        {onToggleDevTweets && (
          <Button
            className="mt-2"
            onClick={onToggleDevTweets}
            variant="outline"
          >
            {showDevTweets ? "Hide" : "Show"} Development Tweets
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <AnimatePresence mode="popLayout">
        {visibleTweets.map((tweet) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl"
            exit={
              shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }
            }
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            key={tweet.id}
            layout={!shouldReduceMotion}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    layout: {
                      type: "spring",
                      stiffness: 350,
                      damping: 30,
                    },
                    opacity: { duration: 0.2 },
                  }
            }
          >
            {showActions ? (
              <TweetWithActions
                apiSecret={apiSecret}
                content={tweet.content}
                onDelete={onDelete}
                onToggleSaved={onToggleSaved}
                onToggleSeen={onToggleSeen}
                saved={tweet.saved}
                savedAt={tweet.savedAt}
                seen={tweet.seen}
                submittedBy={tweet.submittedBy}
                tweetId={tweet.id}
              />
            ) : (
              <div className="tweet-container flex justify-center">
                {tweet.content ? (
                  <EmbeddedTweet tweet={tweet.content} />
                ) : (
                  <Tweet id={tweet.id} />
                )}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {hasMore && (
        <div
          aria-hidden="true"
          className="flex w-full items-center justify-center py-6 text-muted-foreground text-sm"
          ref={sentinelRef}
        >
          Loading more tweets…
        </div>
      )}
    </div>
  );
}
