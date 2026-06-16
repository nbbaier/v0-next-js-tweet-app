"use client";

import { useState } from "react";
import { DEVELOPMENT_TWEET_IDS } from "@/lib/development-tweets";
import type { TweetData } from "@/lib/tweet-service";
import { TweetList } from "./tweet-list";

interface TweetFeedProps {
  showActions?: boolean;
  tweets: TweetData[];
}

export function TweetFeed({ tweets, showActions = true }: TweetFeedProps) {
  const [showDevTweets, setShowDevTweets] = useState(false);

  // If we're showing dev tweets and there are no real tweets, create dev tweet data
  const displayTweets =
    tweets.length === 0 && showDevTweets
      ? DEVELOPMENT_TWEET_IDS.map((id) => ({
          id,
          type: "tweet" as const,
          submittedBy: ["dev"],
        }))
      : tweets;

  return (
    <TweetList
      isEmpty={tweets.length === 0}
      onToggleDevTweets={() => setShowDevTweets(!showDevTweets)}
      showActions={showActions}
      showDevTweets={showDevTweets}
      tweets={displayTweets}
    />
  );
}
