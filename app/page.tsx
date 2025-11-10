import { TweetFeedHeader } from "@/components/tweet-feed-header";
import { TweetList } from "@/components/tweet-list";
import { TweetSubmitForm } from "@/components/tweet-submit-form";
import { getTweetIds } from "@/lib/tweet-config";
import { fetchTweetsWithCache } from "@/lib/tweet-service";

export default async function Home() {
	const tweetIds = await getTweetIds();
	const tweets = await fetchTweetsWithCache(tweetIds);

	return (
		<div className="min-h-screen flex flex-col">
			<TweetFeedHeader />

			<main className="flex-1 flex flex-col items-center p-4 gap-8">
				{/* Tweet submission form */}
				<section className="w-full max-w-2xl mt-8">
					<TweetSubmitForm />
				</section>

				{/* Tweet feed */}
				<section className="w-full max-w-4xl">
					<h2 className="text-2xl font-semibold mb-6 text-center">
						Your Shared Tweets
					</h2>
					<TweetList tweets={tweets} showActions={true} />
				</section>
			</main>

			<footer className="border-t py-6 mt-8">
				<div className="flex justify-center">
					<p className="text-center text-sm text-muted-foreground">
						Shared tweet feed • Add tweets from Twitter/X to save and share
					</p>
				</div>
			</footer>
		</div>
	);
}
