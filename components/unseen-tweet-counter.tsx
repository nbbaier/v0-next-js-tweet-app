import { Badge } from "@/components/ui/badge";
import type { TweetData } from "@/lib/tweet-service";

interface UnseenTweetCounterProps {
	tweets: TweetData[];
}

export function UnseenTweetCounter({ tweets }: UnseenTweetCounterProps) {
	// Calculate unseen tweets per person
	const unseenCounts = tweets.reduce(
		(acc, tweet) => {
			// Only count if the tweet is explicitly marked as unseen (seen === false)
			if (tweet.seen !== true) {
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
		<div className="w-full max-w-[550px] mx-auto mb-0">
			<div>
				<div className="flex flex-wrap gap-3">
					{peopleWithUnseen.map(([person, count]) => (
						<Badge key={person} variant="secondary">
							<span className="text-xs font-medium">{person}</span>
							<span className="text-xs font-bold text-primary-background">
								{count}
							</span>
						</Badge>
					))}
				</div>
			</div>
		</div>
	);
}
