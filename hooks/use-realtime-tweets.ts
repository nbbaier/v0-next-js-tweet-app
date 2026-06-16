/**
 * React hook for real-time tweet updates via Upstash Realtime
 */

"use client";

import { useRealtime } from "@upstash/realtime/client";
import { useEffect, useState } from "react";
import type { RealtimeEvents } from "@/lib/realtime";
import type { TweetData } from "@/lib/tweet-service";

interface UseRealtimeTweetsOptions {
  enabled?: boolean;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
}

export function useRealtimeTweets(
  initialTweets: TweetData[],
  options: UseRealtimeTweetsOptions = {}
) {
  const { enabled = true, onError, onConnected, onDisconnected } = options;
  const [tweets, setTweets] = useState<TweetData[]>(initialTweets);

  // Tweet added handler
  const { status: statusAdded } = useRealtime<RealtimeEvents, "tweet.added">({
    enabled,
    channels: ["tweets"],
    events: ["tweet.added"],
    onData: (data) => {
      console.log("[Realtime Hook] ✅ Received tweet.added event:", data);
      const tweet = data.data.tweet;
      setTweets((prev) => {
        if (prev.some((t) => t.id === tweet.id)) {
          return prev.map((t) => (t.id === tweet.id ? tweet : t));
        }
        return [tweet, ...prev];
      });
      console.log("[Realtime] Tweet added:", tweet.id);
    },
  });

  // Tweet removed handler
  useRealtime<RealtimeEvents, "tweet.removed">({
    enabled,
    channels: ["tweets"],
    events: ["tweet.removed"],
    onData: (data) => {
      console.log("[Realtime Hook] ✅ Received tweet.removed event:", data);
      setTweets((prev) => prev.filter((t) => t.id !== data.data.id));
      console.log("[Realtime] Tweet removed:", data.data.id);
    },
  });

  // Tweet updated handler
  useRealtime<RealtimeEvents, "tweet.updated">({
    enabled,
    channels: ["tweets"],
    events: ["tweet.updated"],
    onData: (data) => {
      console.log("[Realtime Hook] ✅ Received tweet.updated event:", data);
      const tweet = data.data.tweet;
      setTweets((prev) =>
        prev.map((t) => (t.id === tweet.id ? { ...t, ...tweet } : t))
      );
      console.log("[Realtime] Tweet updated:", tweet.id);
    },
  });

  // Tweet reorder handler
  useRealtime<RealtimeEvents, "tweet.reorder">({
    enabled,
    channels: ["tweets"],
    events: ["tweet.reorder"],
    onData: (data) => {
      console.log("[Realtime Hook] ✅ Received tweet.reorder event:", data);
      setTweets((prev) => {
        const tweetMap = new Map(prev.map((t) => [t.id, t]));
        return data.data.tweetIds
          .map((id: string) => tweetMap.get(id))
          .filter((t): t is TweetData => t !== undefined);
      });
      console.log("[Realtime] Tweets reordered");
    },
  });

  // Tweet saved handler
  useRealtime<RealtimeEvents, "tweet.saved">({
    enabled,
    channels: ["tweets"],
    events: ["tweet.saved"],
    onData: (data) => {
      console.log("[Realtime Hook] Received tweet.saved event:", data);
      setTweets((prev) =>
        prev.map((t) =>
          t.id === data.data.tweetId ? { ...t, saved: data.data.saved } : t
        )
      );
      console.log(
        "[Realtime] Tweet saved status updated:",
        data.data.tweetId,
        data.data.saved
      );
    },
  });

  // Tweet seen handler
  useRealtime<RealtimeEvents, "tweet.seen">({
    enabled,
    channels: ["tweets"],
    events: ["tweet.seen"],
    onData: (data) => {
      console.log("[Realtime Hook] ✅ Received tweet.seen event:", data);
      setTweets((prev) =>
        prev.map((t) =>
          t.id === data.data.tweetId ? { ...t, seen: data.data.seen } : t
        )
      );
      console.log(
        "[Realtime] Tweet seen status updated:",
        data.data.tweetId,
        data.data.seen
      );
    },
  });

  const isConnected = statusAdded === "connected";

  useEffect(() => {
    console.log("[Realtime Hook] Status changed to:", statusAdded);
    if (isConnected) {
      console.log(
        "[Realtime Hook] ✅ Connected! Listening for events on channels: ['tweets']"
      );
      onConnected?.();
    } else if (statusAdded === "disconnected") {
      onDisconnected?.();
    } else if (statusAdded === "error") {
      onError?.(new Error("Realtime connection error"));
    }
  }, [statusAdded, isConnected, onConnected, onDisconnected, onError]);

  useEffect(() => {
    setTweets(initialTweets);
  }, [initialTweets]);

  return {
    tweets,
    setTweets,
    isConnected,
    reconnect: () => {
      console.log(
        "[Realtime] Reconnect requested - handled automatically by useRealtime"
      );
    },
    disconnect: () => {
      console.log(
        "[Realtime] Disconnect requested - set enabled=false to disconnect"
      );
    },
  };
}
