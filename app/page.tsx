import { getTweetIds } from "@/lib/tweet-config"
import { fetchTweetsWithCache } from "@/lib/tweet-service"
import { TweetList } from "@/components/tweet-list"
import { TweetFeedHeader } from "@/components/tweet-feed-header"

export default async function Home() {
  // Fetch tweet IDs (hard-coded for dev, external source in production)
  const tweetIds = await getTweetIds()

  // Fetch tweets with caching
  const tweets = await fetchTweetsWithCache(tweetIds)

  return (
    <div className="min-h-screen">
      <TweetFeedHeader />

      <main className="container py-8">
        <TweetList tweets={tweets} />
      </main>

      <footer className="border-t py-6 mt-12">
        <div className="container text-center text-sm text-muted-foreground">
          <p>Tweet feed powered by Next.js 16 with intelligent caching</p>
        </div>
      </footer>
    </div>
  )
}
