import { TweetFeed } from "@/components/tweet-feed";
import { TweetFeedHeader } from "@/components/tweet-feed-header";
import { TweetSubmitForm } from "@/components/tweet-submit-form";
import { UnseenTweetCounter } from "@/components/unseen-tweet-counter";
import { getTweetIds } from "@/lib/tweet-config";
import { fetchTweetsWithCache } from "@/lib/tweet-service";

export default async function Home() {
	const tweetIds = await getTweetIds();
	const tweets = await fetchTweetsWithCache(tweetIds);

	return (
		<div className="min-h-screen flex flex-col px-4">
			<TweetFeedHeader />

			<main className="flex-1 flex flex-col items-center py-0 gap-6 outline-red-500">
				<section className="bg-card w-full max-w-2xl mt-2">
					<TweetSubmitForm />
				</section>

				<UnseenTweetCounter tweets={tweets} />

				<section
					id="tweet-feed"
					className={`w-full max-w-[550px] b bg-card border-t py-6 border-b max-h-screen overflow-y-auto`}
				>
					<TweetFeed tweets={tweets} showActions={true} />
				</section>
			</main>
		</div>
	);
}
