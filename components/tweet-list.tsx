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
			<div className="flex flex-col gap-4 justify-center items-center py-12">
				<p className="text-lg text-muted-foreground">No tweets to display</p>
				<p className="max-w-md text-sm text-center text-muted-foreground">
					Add your first tweet using the form above, or toggle development
					tweets to see some examples.
				</p>
				{onToggleDevTweets && (
					<Button
						onClick={onToggleDevTweets}
						variant="outline"
						className="mt-2"
					>
						{showDevTweets ? "Hide" : "Show"} Development Tweets
					</Button>
				)}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4 items-center w-full">
			{tweets.map((tweet) => (
				<div key={tweet.id} className="w-full max-w-2xl">
					{showActions ? (
						<TweetWithActions
							tweetId={tweet.id}
							submittedBy={tweet.submittedBy}
							seen={tweet.seen}
							apiSecret={apiSecret}
						/>
					) : (
						<div className="flex justify-center tweet-container">
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
