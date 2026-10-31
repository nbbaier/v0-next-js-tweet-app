import { type InferRealtimeEvents, Realtime } from "@upstash/realtime";
import { z } from "zod";
import { redis } from "./redis";

const tweetDataSchema = z.object({
  id: z.string(),
  saved: z.boolean().optional(),
  seen: z.boolean().optional(),
  submittedBy: z.array(z.string()),
});

const schema = {
  tweet: {
    added: z.object({
      tweet: tweetDataSchema,
    }),
    removed: z.object({
      id: z.string(),
    }),
    saved: z.object({
      saved: z.boolean(),
      tweetId: z.string(),
    }),
    seen: z.object({
      seen: z.boolean(),
      tweetId: z.string(),
    }),
    updated: z.object({
      tweet: tweetDataSchema,
    }),
  },
};

export const realtime = new Realtime({
  maxDurationSecs: 300,
  redis,
  schema,
});

export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;
