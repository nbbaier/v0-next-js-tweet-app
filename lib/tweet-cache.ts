/**
 * Tweet caching service - Upstash KV implementation
 */

import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_KV_KV_REST_API_URL!,
  token: process.env.UPSTASH_KV_KV_REST_API_TOKEN!,
})

const CACHE_TTL = 3600 // 1 hour in seconds

export async function getCachedTweet(tweetId: string): Promise<any | null> {
  try {
    const cached = await redis.get(`tweet:${tweetId}`)

    if (cached) {
      console.log(`[Cache HIT] Tweet ${tweetId}`)
      return cached
    }

    console.log(`[Cache MISS] Tweet ${tweetId}`)
    return null
  } catch (error) {
    console.error(`[Cache ERROR] Failed to get tweet ${tweetId}:`, error)
    return null
  }
}

export async function setCachedTweet(tweetId: string, data: any): Promise<void> {
  try {
    await redis.set(`tweet:${tweetId}`, data, { ex: CACHE_TTL })
    console.log(`[Cache SET] Tweet ${tweetId}`)
  } catch (error) {
    console.error(`[Cache ERROR] Failed to set tweet ${tweetId}:`, error)
  }
}
