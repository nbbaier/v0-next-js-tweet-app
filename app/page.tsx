import { FilterableTweetFeed } from "@/components/filterable-tweet-feed";
import { TweetFeedHeader } from "@/components/tweet-feed-header";
import { getTweetIds } from "@/lib/tweet-config";
import { fetchTweetsWithCache } from "@/lib/tweet-service";

export default async function Home() {
	const tweetIds = await getTweetIds();
	const tweets = await fetchTweetsWithCache(tweetIds);

	return (
		<div className="flex flex-col min-h-screen">
			<TweetFeedHeader />

			<main className="flex flex-col flex-1 items-center">
				<FilterableTweetFeed tweets={tweets} showActions={true} />
			</main>
		</div>
	);
}
