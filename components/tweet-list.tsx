import type { TweetData } from "@/lib/tweet-service";
import { TweetWithActions } from "./tweet-with-actions";
import { Button } from "./ui/button";

interface TweetListProps {
	tweets: TweetData[];
	showActions?: boolean;
	apiSecret?: string;
	isEmpty?: boolean;
	showDevTweets?: boolean;
	onToggleDevTweets?: () => void;
}

export function TweetList({
	tweets,
	showActions = true,
	apiSecret,
	isEmpty = false,
	showDevTweets = false,
	onToggleDevTweets,
}: TweetListProps) {
	if (isEmpty && tweets.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-12 gap-4">
				<p className="text-muted-foreground text-lg">No tweets to display</p>
				<p className="text-sm text-muted-foreground max-w-md text-center">
					Add your first tweet using the form above, or toggle development tweets
					to see some examples.
				</p>
				{onToggleDevTweets && (
					<Button onClick={onToggleDevTweets} variant="outline" className="mt-2">
						{showDevTweets ? "Hide" : "Show"} Development Tweets
					</Button>
				)}
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center w-full gap-4">
			{tweets.map((tweet) => (
				<div key={tweet.id} className="w-full max-w-2xl">
					{showActions ? (
						<TweetWithActions
							tweetId={tweet.id}
							apiSecret={apiSecret}
							submittedBy={tweet.submittedBy}
							seen={tweet.seen}
						/>
					) : (
						<div className="tweet-container flex justify-center">
							{/* @ts-expect-error - React 19 compatibility issue with react-tweet */}
							<Tweet id={tweet.id} />
						</div>
					)}
				</div>
			))}
		</div>
	);
}

// Re-export Tweet for backwards compatibility if needed
import { Tweet } from "react-tweet";
export { Tweet };
