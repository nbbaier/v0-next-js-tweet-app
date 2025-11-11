/**
 * API route for managing tweets
 * POST - Add a new tweet
 * GET - Get all tweets (optional, mainly for testing)
 */

import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseTweetUrl } from "@/lib/tweet-parser";
import {
	addTweetToStorage,
	getTweetIdsFromStorage,
	tweetExistsInStorage,
} from "@/lib/tweet-storage";

/**
 * POST /api/tweets
 * Adds a new tweet to storage
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { url, secret, submittedBy } = body;

		// Validate API secret
		const apiSecret = process.env.TWEET_API_SECRET;
		if (!apiSecret) {
			return NextResponse.json(
				{ error: "API secret not configured on server" },
				{ status: 500 },
			);
		}

		if (!secret || secret !== apiSecret) {
			return NextResponse.json(
				{ error: "Invalid or missing API secret" },
				{ status: 401 },
			);
		}

		// Validate input
		if (!url || typeof url !== "string") {
			return NextResponse.json(
				{ error: "Missing or invalid tweet URL" },
				{ status: 400 },
			);
		}

		// Parse tweet URL
		const parsed = parseTweetUrl(url);
		if (!parsed) {
			return NextResponse.json(
				{ error: "Invalid tweet URL or ID format" },
				{ status: 400 },
			);
		}

		// Check if tweet already exists
		const exists = await tweetExistsInStorage(parsed.id);
		if (exists) {
			return NextResponse.json(
				{ error: "Tweet already exists", tweetId: parsed.id },
				{ status: 409 },
			);
		}

		// Add to storage
		const metadata = await addTweetToStorage(parsed.id, submittedBy);

		// Revalidate the home page to show new tweet
		revalidatePath("/");

		return NextResponse.json(
			{
				success: true,
				tweetId: parsed.id,
				metadata,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("[API ERROR] Failed to add tweet:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * GET /api/tweets
 * Returns all tweet IDs (for testing/debugging)
 */
export async function GET(request: NextRequest) {
	try {
		// Optional: require auth for GET as well
		const apiSecret = process.env.TWEET_API_SECRET;
		const authHeader = request.headers.get("x-api-secret");

		if (apiSecret && authHeader !== apiSecret) {
			return NextResponse.json(
				{ error: "Invalid or missing API secret" },
				{ status: 401 },
			);
		}

		const tweetIds = await getTweetIdsFromStorage();

		return NextResponse.json({
			success: true,
			tweetIds,
			count: tweetIds.length,
		});
	} catch (error) {
		console.error("[API ERROR] Failed to get tweets:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
