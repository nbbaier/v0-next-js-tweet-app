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

	// Load stored API secret from localStorage on mount
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
		<div className="w-full space-y-0  ">
			{/* Tweet display */}
			<div className="tweet-container flex justify-center ">
				<Tweet id={tweetId} />
			</div>

			{/* Action buttons below the tweet */}
			<div className="flex justify-end">
				{!showConfirm ? (
					<Button
						variant="destructive"
						onClick={() => setShowConfirm(true)}
						disabled={isDeleting}
					>
						Delete Tweet
					</Button>
				) : (
					<div className="bg-card border rounded-md p-4 shadow-lg space-y-3">
						<p className="text-sm font-medium">
							Are you sure you want to delete this tweet?
						</p>

						{error && (
							<p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
								{error}
							</p>
						)}

						<div className="flex gap-2 justify-end">
							<button
								type="button"
								onClick={() => {
									setShowConfirm(false);
									setError(null);
								}}
								disabled={isDeleting}
								className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleDelete}
								disabled={isDeleting}
								className="px-4 py-2 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{isDeleting ? "Deleting..." : "Delete"}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
