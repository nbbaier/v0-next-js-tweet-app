"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EmbeddedTweet, Tweet } from "react-tweet";
import type { TweetData } from "@/lib/tweet-service";
import { Confetti } from "./confetti";
import { TweetWithActions } from "./tweet-with-actions";
import { Button } from "./ui/button";

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
}: TweetListProps) {
  const shouldReduceMotion = useReducedMotion();

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
        {tweets.map((tweet) => (
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
    </div>
  );
}
