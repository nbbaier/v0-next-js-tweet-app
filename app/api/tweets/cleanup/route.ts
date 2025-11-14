/**
 * API route for cleaning up old tweets
 * GET /api/tweets/cleanup - Removes tweets older than 3 days (used by Vercel cron)
 * DELETE /api/tweets/cleanup - Removes tweets older than 3 days (with auth)
 */

import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { cleanupOldTweets, getExpiredTweets } from "@/lib/tweet-cleanup";

/**
 * Validates the request authorization
 * Allows Vercel cron requests (CRON_SECRET) or API secret auth
 */
function isAuthorized(request: NextRequest): boolean {
	const apiSecret = process.env.TWEET_API_SECRET;
	const cronSecret = process.env.CRON_SECRET;
	const authHeader = request.headers.get("x-api-secret");
	const cronAuthHeader = request.headers.get("authorization");

	// Check if it's a Vercel cron request
	if (cronSecret && cronAuthHeader === `Bearer ${cronSecret}`) {
		return true;
	}

	// Check if it's a regular API request with secret
	if (apiSecret && authHeader === apiSecret) {
		return true;
	}

	return false;
}

/**
 * GET /api/tweets/cleanup
 * Removes tweets older than 3 days (used by Vercel cron)
 * Also shows preview of expired tweets when called with ?preview=true
 */
export async function GET(request: NextRequest) {
	try {
		// Check if this is a preview request
		const isPreview = request.nextUrl.searchParams.get("preview") === "true";

		if (isPreview) {
			// Validate auth for preview
			if (!isAuthorized(request)) {
				return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
			}

			const expiredTweets = await getExpiredTweets();
			return NextResponse.json({
				success: true,
				expiredTweets,
				count: expiredTweets.length,
			});
		}

		// Validate authorization (allows both Vercel cron and API secret)
		if (!isAuthorized(request)) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Execute cleanup
		const result = await cleanupOldTweets();

		// Revalidate the home page to reflect deleted tweets
		revalidatePath("/");

		return NextResponse.json(
			{
				success: true,
				...result,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("[API ERROR] Failed to cleanup tweets:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/tweets/cleanup
 * Removes tweets older than 3 days (with auth)
 */
export async function DELETE(request: NextRequest) {
	try {
		// Validate authorization
		if (!isAuthorized(request)) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Execute cleanup
		const result = await cleanupOldTweets();

		// Revalidate the home page to reflect deleted tweets
		revalidatePath("/");

		return NextResponse.json(
			{
				success: true,
				...result,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("[API ERROR] Failed to cleanup tweets:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
