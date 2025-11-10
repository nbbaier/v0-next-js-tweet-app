/**
 * Tweet list component
 * Renders a list of tweets using react-tweet
 */

import { Tweet } from "react-tweet";
import type { TweetData } from "@/lib/tweet-service";

interface TweetListProps {
	tweets: TweetData[];
}

export function TweetList({ tweets }: TweetListProps) {
	if (tweets.length === 0) {
		return (
			<div className="flex items-center justify-center py-12">
				<p className="text-muted-foreground">No tweets to display</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center w-full">
			{tweets.map((tweet) => (
				<div key={tweet.id} className="tweet-container flex justify-center">
					<Tweet id={tweet.id} />
				</div>
			))}
		</div>
	);
}
