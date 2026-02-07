/**
 * API route for individual tweet operations
 * DELETE - Remove a tweet from storage
 */

import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { isValidTweetId } from "@/lib/tweet-parser";
import {
	getTweetMetadata,
	removeTweetFromStorage,
	updateTweetSaved,
	updateTweetSeen,
} from "@/lib/tweet-storage";

/**
 * DELETE /api/tweets/[id]
 * Removes a tweet from storage
 */
export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	try {
		const { id: tweetId } = await context.params;

		// Validate API secret
		const apiSecret = process.env.TWEET_API_SECRET;
		if (!apiSecret) {
			return NextResponse.json(
				{ error: "API secret not configured on server" },
				{ status: 500 },
			);
		}

		const authHeader = request.headers.get("x-api-secret");
		if (!authHeader || authHeader !== apiSecret) {
			return NextResponse.json(
				{ error: "Invalid or missing API secret" },
				{ status: 401 },
			);
		}

		// Validate tweet ID format
		if (!isValidTweetId(tweetId)) {
			return NextResponse.json(
				{ error: "Invalid tweet ID format" },
				{ status: 400 },
			);
		}

		// Remove from storage
		const removed = await removeTweetFromStorage(tweetId);

		if (!removed) {
			return NextResponse.json({ error: "Tweet not found" }, { status: 404 });
		}

		// Revalidate the home page
		revalidatePath("/");

		return NextResponse.json({
			success: true,
			tweetId,
			message: "Tweet removed successfully",
		});
	} catch (error) {
		console.error("[API ERROR] Failed to delete tweet:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/tweets/[id]
 * Updates tweet metadata (e.g., seen status)
 */
export async function PATCH(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	try {
		const { id: tweetId } = await context.params;

		// Validate tweet ID format
		if (!isValidTweetId(tweetId)) {
			return NextResponse.json(
				{ error: "Invalid tweet ID format" },
				{ status: 400 },
			);
		}

		// Parse request body
		const body = await request.json();
		const { seen, saved } = body;

		if (typeof seen !== "boolean" && typeof saved !== "boolean") {
			return NextResponse.json(
				{
					error: "Must provide 'seen' (boolean) or 'saved' (boolean).",
				},
				{ status: 400 },
			);
		}

		// Track if any update was performed and if tweet was found
		let found = false;

		// Update seen status if provided
		if (typeof seen === "boolean") {
			const result = await updateTweetSeen(tweetId, seen);
			if (result) found = true;
		}

		// Update saved status if provided
		if (typeof saved === "boolean") {
			const result = await updateTweetSaved(tweetId, saved);
			if (result) found = true;
		}

		if (!found) {
			return NextResponse.json({ error: "Tweet not found" }, { status: 404 });
		}

		// Fetch the final metadata to return the combined state
		const updatedMetadata = await getTweetMetadata(tweetId);

		// Revalidate the home page
		revalidatePath("/");

		return NextResponse.json({
			success: true,
			metadata: updatedMetadata,
		});
	} catch (error) {
		console.error("[API ERROR] Failed to update tweet:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
