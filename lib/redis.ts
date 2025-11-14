import { Redis } from "@upstash/redis";

if (
	!process.env.UPSTASH_KV_KV_REST_API_URL ||
	!process.env.UPSTASH_KV_KV_REST_API_TOKEN
) {
	throw new Error(
		"UPSTASH_KV_KV_REST_API_URL and UPSTASH_KV_KV_REST_API_TOKEN must be set",
	);
}

export const redis = new Redis({
	url: process.env.UPSTASH_KV_KV_REST_API_URL,
	token: process.env.UPSTASH_KV_KV_REST_API_TOKEN,
});
