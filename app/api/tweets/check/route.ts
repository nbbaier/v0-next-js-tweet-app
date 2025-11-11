/**
 * Lightweight endpoint to check if tweets have been updated
 * Returns only the last updated timestamp for efficient polling
 */

import { NextResponse } from "next/server";
import { getLastUpdated } from "@/lib/tweet-storage";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export async function GET() {
	const requestTime = Date.now();
	console.log(
		`[API /tweets/check] 📨 Request received at ${new Date(requestTime).toLocaleTimeString()}`,
	);

	try {
		const lastUpdated = await getLastUpdated();

		console.log("[API /tweets/check] 💾 Retrieved lastUpdated:", {
			lastUpdated: lastUpdated || 0,
			lastUpdatedTime: lastUpdated
				? new Date(lastUpdated).toLocaleString()
				: "never",
			requestProcessingTime: `${Date.now() - requestTime}ms`,
		});

		const response = {
			lastUpdated: lastUpdated || 0,
			timestamp: Date.now(),
		};

		console.log("[API /tweets/check] ✅ Sending response:", response);

		return NextResponse.json(response);
	} catch (error) {
		console.error("[API /tweets/check] ❌ ERROR occurred:", error);
		console.error("[API /tweets/check] Error details:", {
			message: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return NextResponse.json(
			{ error: "Failed to check updates" },
			{ status: 500 },
		);
	}
}
