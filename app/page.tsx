import { TweetFeedHeader } from "@/components/tweet-feed-header";
import { TweetList } from "@/components/tweet-list";
import { getTweetIds } from "@/lib/tweet-config";
import { fetchTweetsWithCache } from "@/lib/tweet-service";

export default async function Home() {
	const tweetIds = await getTweetIds();
	const tweets = await fetchTweetsWithCache(tweetIds);

	return (
		<div className="min-h-screen flex flex-col">
			<TweetFeedHeader />

			<main className="flex-1 flex flex-col items-center justify-center p-4">
				<TweetList tweets={tweets} />
			</main>

			<footer className="border-t py-6">
				<div className="flex justify-center">
					<p className="text-center">
						Tweet feed powered by Next.js 16 with intelligent caching
					</p>
				</div>
			</footer>
		</div>
	);
}
