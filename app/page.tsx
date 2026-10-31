import { Suspense } from "react";
import { FilterableTweetFeed } from "@/components/filterable-tweet-feed";
import { TweetFeedHeader } from "@/components/tweet-feed-header";
import { fetchTweetsWithCache, getAllTweetIds } from "@/lib/tweet-service";

export default async function Home() {
  const tweets = await fetchTweetsWithCache(await getAllTweetIds());

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
            <FilterableTweetFeed tweets={tweets} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
