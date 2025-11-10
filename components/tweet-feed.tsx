"use client";

import { useState } from "react";
import type { TweetData } from "@/lib/tweet-service";
import { TweetList } from "./tweet-list";
import { DEVELOPMENT_TWEET_IDS } from "@/lib/development-tweets";

interface TweetFeedProps {
	tweets: TweetData[];
	showActions?: boolean;
}

export function TweetFeed({ tweets, showActions = true }: TweetFeedProps) {
	const [showDevTweets, setShowDevTweets] = useState(false);

	// If we're showing dev tweets and there are no real tweets, create dev tweet data
	const displayTweets =
		tweets.length === 0 && showDevTweets
			? DEVELOPMENT_TWEET_IDS.map((id) => ({
					id,
					type: "tweet" as const,
			  }))
			: tweets;

	return (
		<TweetList
			tweets={displayTweets}
			showActions={showActions}
			isEmpty={tweets.length === 0}
			showDevTweets={showDevTweets}
			onToggleDevTweets={() => setShowDevTweets(!showDevTweets)}
		/>
	);
}
