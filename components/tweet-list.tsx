/**
 * Tweet list component
 * Renders a list of tweets using react-tweet with action buttons
 */

import { TweetWithActions } from "./tweet-with-actions"
import type { TweetData } from "@/lib/tweet-service"

interface TweetListProps {
  tweets: TweetData[]
  showActions?: boolean
  apiSecret?: string
}

export function TweetList({
  tweets,
  showActions = true,
  apiSecret,
}: TweetListProps) {
  if (tweets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">No tweets to display</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center w-full gap-4">
      {tweets.map((tweet) => (
        <div key={tweet.id} className="w-full max-w-2xl">
          {showActions ? (
            <TweetWithActions tweetId={tweet.id} apiSecret={apiSecret} />
          ) : (
            <div className="tweet-container flex justify-center">
              {/* @ts-expect-error - React 19 compatibility issue with react-tweet */}
              <Tweet id={tweet.id} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Re-export Tweet for backwards compatibility if needed
import { Tweet } from "react-tweet"
export { Tweet }
