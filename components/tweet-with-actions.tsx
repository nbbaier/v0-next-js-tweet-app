"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Tweet } from "react-tweet";
import { Button } from "./ui/button";

interface TweetWithActionsProps {
	tweetId: string;
	apiSecret?: string;
}

export function TweetWithActions({
	tweetId,
	apiSecret,
}: TweetWithActionsProps) {
	const [isDeleting, setIsDeleting] = useState(false);
	const [showConfirm, setShowConfirm] = useState(false);
	const [storedSecret, setStoredSecret] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	useEffect(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("tweet_api_secret");
			if (saved) {
				setStoredSecret(saved);
			}
		}
	}, []);

	const handleDelete = async () => {
		const secretToUse = apiSecret || storedSecret;

		if (!secretToUse) {
			setError("No API secret found. Please set it in the form above.");
			return;
		}

		setIsDeleting(true);
		setError(null);

		try {
			const response = await fetch(`/api/tweets/${tweetId}`, {
				method: "DELETE",
				headers: {
					"x-api-secret": secretToUse,
				},
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to delete tweet");
			}

			// Refresh the page to update the list
			router.refresh();
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Failed to delete tweet",
			);
			setIsDeleting(false);
		}
	};

	return (
		<div className="flex flex-col items-center space-y-1 w-full">
			{/* Tweet display */}
			<div className="flex justify-center w-full tweet-container">
				{/* @ts-expect-error - React 19 compatibility issue with react-tweet */}
				<Tweet id={tweetId} />
			</div>

			{/* Action buttons below the tweet - constrained to tweet width */}
			<div className="w-full max-w-[calc(550px+1rem)] flex justify-end px-2">
				{!showConfirm ? (
					<Button
						variant="destructive"
						size="sm"
						onClick={() => setShowConfirm(true)}
						disabled={isDeleting}
					>
						Delete Tweet
					</Button>
				) : (
					<div className="p-4 space-y-3 w-full rounded-md border border-border shadow-lg bg-card">
						<p className="text-sm font-medium">
							Are you sure you want to delete this tweet?
						</p>

						{error && (
							<p className="p-2 text-xs text-red-600 bg-red-50 rounded dark:bg-red-900/20">
								{error}
							</p>
						)}

						<div className="flex gap-2 justify-end">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => {
									setShowConfirm(false);
									setError(null);
								}}
								disabled={isDeleting}
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="destructive"
								size="sm"
								onClick={handleDelete}
								disabled={isDeleting}
							>
								{isDeleting ? "Deleting..." : "Delete"}
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
