"use client";

import { useCallback, useState } from "react";
import { DEVELOPMENT_TWEET_IDS } from "@/lib/development-tweets";
import type { TweetData } from "@/lib/tweet-service";
import { TweetList } from "./tweet-list";

interface TweetFeedProps {
  showActions?: boolean;
  tweets: TweetData[];
}

export function TweetFeed({ tweets, showActions = true }: TweetFeedProps) {
  const [showDevTweets, setShowDevTweets] = useState(false);
  const toggleDevTweets = useCallback(
    () => setShowDevTweets((show) => !show),
    []
  );

  // If we're showing dev tweets and there are no real tweets, create dev tweet data
  const displayTweets =
    tweets.length === 0 && showDevTweets
      ? DEVELOPMENT_TWEET_IDS.map((id) => ({
          id,
          submittedBy: ["dev"],
          type: "tweet" as const,
        }))
      : tweets;

  return (
    <TweetList
      isEmpty={tweets.length === 0}
      onToggleDevTweets={toggleDevTweets}
      showActions={showActions}
      showDevTweets={showDevTweets}
      tweets={displayTweets}
    />
  );
}
