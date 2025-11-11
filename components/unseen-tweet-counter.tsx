import type { TweetData } from "@/lib/tweet-service";

interface UnseenTweetCounterProps {
	tweets: TweetData[];
}

export function UnseenTweetCounter({ tweets }: UnseenTweetCounterProps) {
	// Calculate unseen tweets per person
	const unseenCounts = tweets.reduce(
		(acc, tweet) => {
			// Only count if the tweet is explicitly marked as unseen (seen === false)
			if (tweet.seen === false) {
				const submitter = tweet.submittedBy || "Unknown";
				acc[submitter] = (acc[submitter] || 0) + 1;
			}
			return acc;
		},
		{} as Record<string, number>,
	);

	// Get list of people with unseen tweets
	const peopleWithUnseen = Object.entries(unseenCounts)
		.filter(([_, count]) => count > 0)
		.sort(([a], [b]) => a.localeCompare(b));

	if (peopleWithUnseen.length === 0) {
		return null;
	}

	return (
		<div className="w-full max-w-[550px] mx-auto mb-4">
			<div className="bg-card border border-border rounded-lg p-4">
				<h2 className="text-sm font-semibold mb-3 text-muted-foreground">
					Unseen Tweets
				</h2>
				<div className="flex flex-wrap gap-3">
					{peopleWithUnseen.map(([person, count]) => (
						<div
							key={person}
							className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1.5"
						>
							<span className="text-sm font-medium">{person}</span>
							<span className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
								{count}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
