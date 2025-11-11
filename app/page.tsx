import { TweetFeed } from "@/components/tweet-feed";
import { TweetFeedHeader } from "@/components/tweet-feed-header";
import { TweetSubmitForm } from "@/components/tweet-submit-form";
import { getTweetIds } from "@/lib/tweet-config";
import { fetchTweetsWithCache } from "@/lib/tweet-service";

export default async function Home() {
	const tweetIds = await getTweetIds();
	const tweets = await fetchTweetsWithCache(tweetIds);

	return (
		<div className="min-h-screen flex flex-col px-4">
			<TweetFeedHeader />

			<main className="flex-1 flex flex-col items-center py-0 gap-8 outline-red-500">
				<section className="bg-card w-full max-w-2xl mt-8">
					<TweetSubmitForm />
				</section>

				<section
					id="tweet-feed"
					className={`w-full py-6 max-w-[550px] border-t border-border bg-card max-h-[calc(100vh-20rem)] overflow-y-auto`}
				>
					<TweetFeed tweets={tweets} showActions={true} />
				</section>
			</main>

			{/* <footer className="py-6 mt-8">
				<div className="flex justify-center">
					<p className="text-center text-sm text-muted-foreground">
						Shared tweet feed • Add tweets from Twitter/X to save and share
					</p>
				</div>
			</footer> */}
		</div>
	);
}
