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
    <div className="flex min-h-screen flex-col">
      <TweetFeedHeader />

      <main
        className="flex w-full flex-1 flex-col items-center"
        id="main-content"
        tabIndex={-1}
      >
        <div className="w-full max-w-[550px] px-4">
          <Suspense fallback={null}>
            <FilterableTweetFeed showActions={true} tweets={tweets} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
