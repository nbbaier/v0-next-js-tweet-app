import { FilterableTweetFeed } from "@/components/filterable-tweet-feed";
import { TweetFeedHeader } from "@/components/tweet-feed-header";
import { getTweetIds } from "@/lib/tweet-config";
import { fetchTweetsWithCache } from "@/lib/tweet-service";

export default async function Home() {
	const tweetIds = await getTweetIds();
	const tweets = await fetchTweetsWithCache(tweetIds);

	return (
		<div className="min-h-screen flex flex-col px-4">
			<TweetFeedHeader />

			<main className="flex-1 flex flex-col items-center">
				<FilterableTweetFeed tweets={tweets} showActions={true} />
			</main>
		</div>
	);
}
