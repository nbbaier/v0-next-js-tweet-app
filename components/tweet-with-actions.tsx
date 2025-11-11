"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tweet } from "react-tweet";
import { Button } from "./ui/button";

interface TweetWithActionsProps {
	tweetId: string;
	submittedBy: string;
	seen?: boolean;
}

export function TweetWithActions({
	tweetId,
	submittedBy,
	seen: initialSeen = false,
}: TweetWithActionsProps) {
	const [error, setError] = useState<string | null>(null);
	const [isSeen, setIsSeen] = useState(initialSeen);
	const [isTogglingSeenStatus, setIsTogglingSeenStatus] = useState(false);
	const router = useRouter();

	const handleToggleSeen = async () => {
		setIsTogglingSeenStatus(true);
		setError(null);

		try {
			const response = await fetch(`/api/tweets/${tweetId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ seen: !isSeen }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to update seen status");
			}

			setIsSeen(!isSeen);
			// Optionally refresh to ensure consistency
			router.refresh();
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Failed to update seen status",
			);
		} finally {
			setIsTogglingSeenStatus(false);
		}
	};

	return (
		<div className="flex flex-col items-center space-y-1 w-full">
			{/* Submitter badge */}
			<div className="w-full max-w-[550px] flex justify-start mb-1">
				<span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
					Saved by: {submittedBy}
				</span>
			</div>

			{/* Tweet display with conditional styling for seen tweets */}
			<div
				className={`flex justify-center w-full tweet-container transition-all ${
					isSeen ? "max-h-24 overflow-hidden relative" : ""
				}`}
			>
				{/* @ts-expect-error - React 19 compatibility issue with react-tweet */}
				<Tweet id={tweetId} />
				{isSeen && (
					<div className="absolute inset-0 bg-gradient-to-b from-transparent to-background pointer-events-none" />
				)}
			</div>

			{/* Action button below the tweet - constrained to tweet width */}
			<div className="w-full max-w-[550px] flex justify-end">
				<Button
					variant="outline"
					size="sm"
					onClick={handleToggleSeen}
					disabled={isTogglingSeenStatus}
				>
					{isTogglingSeenStatus
						? "Updating..."
						: isSeen
							? "Mark as Unseen"
							: "Mark as Seen"}
				</Button>
			</div>

			{/* Error display for seen status toggle */}
			{error && (
				<div className="w-full max-w-[550px]">
					<p className="p-2 text-xs text-red-600 bg-red-50 rounded dark:bg-red-900/20">
						{error}
					</p>
				</div>
			)}
		</div>
	);
}
