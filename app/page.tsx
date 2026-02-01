import { Suspense } from "react";
import { FilterableTweetFeed } from "@/components/filterable-tweet-feed";
import { TweetFeedHeader } from "@/components/tweet-feed-header";
import { getTweetIds } from "@/lib/tweet-config";
import { fetchTweetsWithCache } from "@/lib/tweet-service";
import { getSavedTweetIdsFromStorage } from "@/lib/tweet-storage";

export default async function Home() {
	const [tweetIds, savedTweetIds] = await Promise.all([
		getTweetIds(),
		getSavedTweetIdsFromStorage(),
	]);
	const allIds = [...new Set([...tweetIds, ...savedTweetIds])];
	const tweets = await fetchTweetsWithCache(allIds);

	return (
		<div className="flex flex-col min-h-screen">
			<TweetFeedHeader />

			<main
				id="main-content"
				tabIndex={-1}
				className="flex flex-col flex-1 items-center w-full"
			>
				<div className="w-full max-w-[550px] px-4">
					<Suspense fallback={null}>
						<FilterableTweetFeed tweets={tweets} showActions={true} />
					</Suspense>
				</div>
			</main>
		</div>
	);
}
