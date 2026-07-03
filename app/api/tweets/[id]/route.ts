/**
 * API route for individual tweet operations
 * DELETE - Remove a tweet from storage
 */

import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSecret } from "@/lib/api-auth";
import { isValidTweetId } from "@/lib/tweet-parser";
import {
  getTweetMetadata,
  removeTweetFromStorage,
  updateTweetSaved,
  updateTweetSeen,
} from "@/lib/tweet-storage";

const patchBodySchema = z
  .object({
    seen: z.boolean().optional(),
    saved: z.boolean().optional(),
    secret: z.string().optional(),
  })
  .refine((b) => typeof b.seen === "boolean" || typeof b.saved === "boolean", {
    message: "Must provide 'seen' (boolean) or 'saved' (boolean).",
  });

/**
 * DELETE /api/tweets/[id]
 * Removes a tweet from storage
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tweetId } = await context.params;

    const authError = requireApiSecret(request);
    if (authError) {
      return authError;
    }

    // Validate tweet ID format
    if (!isValidTweetId(tweetId)) {
      return NextResponse.json(
        { error: "Invalid tweet ID format" },
        { status: 400 }
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
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tweets/[id]
 * Updates tweet metadata (e.g., seen status)
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tweetId } = await context.params;

    // Validate tweet ID format
    if (!isValidTweetId(tweetId)) {
      return NextResponse.json(
        { error: "Invalid tweet ID format" },
        { status: 400 }
      );
    }

    // Parse request body
    const rawBody = await request.json();
    const bodySecret =
      rawBody && typeof rawBody === "object" && "secret" in rawBody
        ? (rawBody as { secret?: unknown }).secret
        : undefined;

    const authError = requireApiSecret(request, bodySecret);
    if (authError) {
      return authError;
    }

    // Validate request body shape
    const parseResult = patchBodySchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Must provide 'seen' (boolean) or 'saved' (boolean).",
        },
        { status: 400 }
      );
    }

    const { seen, saved } = parseResult.data;

    // Track if any update was performed and if tweet was found
    let found = false;

    // Update seen status if provided
    if (typeof seen === "boolean") {
      const result = await updateTweetSeen(tweetId, seen);
      if (result) {
        found = true;
      }
    }

    // Update saved status if provided
    if (typeof saved === "boolean") {
      const result = await updateTweetSaved(tweetId, saved);
      if (result) {
        found = true;
      }
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
      { status: 500 }
    );
  }
}
