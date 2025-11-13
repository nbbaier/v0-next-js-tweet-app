import { AnimatePresence, motion } from "framer-motion";
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
	onToggleSeen?: (tweetId: string, currentSeenStatus: boolean) => Promise<void>;
}

export function TweetList({
	tweets,
	showActions = true,
	apiSecret,
	isEmpty = false,
	showDevTweets = false,
	onToggleDevTweets,
	onToggleSeen,
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
			<AnimatePresence mode="popLayout">
				{tweets.map((tweet) => (
					<motion.div
						key={tweet.id}
						layout
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.9 }}
						transition={{
							layout: {
								type: "spring",
								stiffness: 350,
								damping: 30,
							},
							opacity: { duration: 0.2 },
						}}
						className="w-full max-w-2xl"
					>
						{showActions ? (
							<TweetWithActions
								tweetId={tweet.id}
								submittedBy={tweet.submittedBy}
								seen={tweet.seen}
								apiSecret={apiSecret}
								onToggleSeen={onToggleSeen}
							/>
						) : (
							<div className="flex justify-center tweet-container">
								{/* @ts-expect-error - React 19 compatibility issue with react-tweet */}
								<Tweet id={tweet.id} />
							</div>
						)}
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	);
}

// Re-export Tweet for backwards compatibility if needed
import { Tweet } from "react-tweet";
export { Tweet };
