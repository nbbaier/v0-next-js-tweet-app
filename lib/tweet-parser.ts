/**
 * Tweet URL parser - Extracts tweet IDs from various Twitter/X URL formats
 */

const TWEET_URL_PATTERNS = [
	// https://twitter.com/username/status/1234567890
	/twitter\.com\/[^/]+\/status\/(\d+)/i,
	// https://x.com/username/status/1234567890
	/x\.com\/[^/]+\/status\/(\d+)/i,
	// https://mobile.twitter.com/username/status/1234567890
	/mobile\.twitter\.com\/[^/]+\/status\/(\d+)/i,
	// Direct tweet ID (just numbers)
	/^(\d+)$/,
];

export interface ParsedTweet {
	id: string;
	url: string;
}

/**
 * Extracts tweet ID from a URL or raw ID
 * @param input - Tweet URL or tweet ID
 * @returns Parsed tweet object or null if invalid
 */
export function parseTweetUrl(input: string): ParsedTweet | null {
	const trimmed = input.trim();

	for (const pattern of TWEET_URL_PATTERNS) {
		const match = trimmed.match(pattern);
		if (match) {
			const tweetId = match[1];
			return {
				id: tweetId,
				url: `https://twitter.com/i/status/${tweetId}`,
			};
		}
	}

	return null;
}

/**
 * Validates if a string is a valid tweet ID (numeric, reasonable length)
 */
export function isValidTweetId(id: string): boolean {
	// Tweet IDs are numeric and typically 15-19 digits (snowflake IDs)
	return /^\d{15,19}$/.test(id);
}
