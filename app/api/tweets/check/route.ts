/**
 * Lightweight endpoint to check if tweets have been updated
 * Returns only the last updated timestamp for efficient polling
 */

import { NextResponse } from "next/server";
import { getLastUpdated } from "@/lib/tweet-storage";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET() {
	try {
		const lastUpdated = await getLastUpdated();

		return NextResponse.json({
			lastUpdated: lastUpdated || 0,
			timestamp: Date.now(),
		});
	} catch (error) {
		console.error("[API ERROR] Failed to check last updated:", error);
		return NextResponse.json(
			{ error: "Failed to check updates" },
			{ status: 500 },
		);
	}
}
