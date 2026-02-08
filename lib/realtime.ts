import { type InferRealtimeEvents, Realtime } from "@upstash/realtime";
import { z } from "zod";
import { redis } from "./redis";

const tweetDataSchema = z.object({
  id: z.string(),
  submittedBy: z.array(z.string()),
  seen: z.boolean().optional(),
  saved: z.boolean().optional(),
});

const schema = {
  tweet: {
    added: z.object({
      tweet: tweetDataSchema,
    }),
    updated: z.object({
      tweet: tweetDataSchema,
    }),
    removed: z.object({
      id: z.string(),
    }),
    reorder: z.object({
      tweetIds: z.array(z.string()),
    }),
    seen: z.object({
      tweetId: z.string(),
      seen: z.boolean(),
    }),
    saved: z.object({
      tweetId: z.string(),
      saved: z.boolean(),
    }),
  },
};

export const realtime = new Realtime({
  schema,
  redis,
  maxDurationSecs: 300,
});

export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;
