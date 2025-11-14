"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Tweet } from "react-tweet";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "./ui/button";

interface TweetWithActionsProps {
	tweetId: string;
	submittedBy: string[]; // Array of poster names
	seen?: boolean;
	apiSecret?: string;
	onToggleSeen?: (tweetId: string, currentSeenStatus: boolean) => Promise<void>;
	onDelete?: (tweetId: string) => Promise<void>;
}

export function TweetWithActions({
	tweetId,
	submittedBy,
	seen: initialSeen = false,
	apiSecret,
	onToggleSeen,
	onDelete,
}: TweetWithActionsProps) {
	const [error, setError] = useState<string | null>(null);
	const [isSeen, setIsSeen] = useState(initialSeen);
	const [isTogglingSeenStatus, setIsTogglingSeenStatus] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [storedSecret, setStoredSecret] = useState<string>("");
	const router = useRouter();

	useEffect(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("tweet_api_secret");
			if (saved) {
				setStoredSecret(saved);
			}
		}
	}, []);

	// Sync seen state with prop changes (for optimistic updates)
	useEffect(() => {
		setIsSeen(initialSeen);
	}, [initialSeen]);

	const handleToggleSeen = async () => {
		setIsTogglingSeenStatus(true);
		setError(null);

		try {
			if (onToggleSeen) {
				// Use the callback for optimistic updates with animation
				await onToggleSeen(tweetId, isSeen);
				setIsSeen(!isSeen);
			} else {
				// Fallback to original behavior
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
				router.refresh();
			}
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Failed to update seen status",
			);
		} finally {
			setIsTogglingSeenStatus(false);
		}
	};

	const handleDelete = async () => {
		const secretToUse = apiSecret || storedSecret;

		if (!secretToUse) {
			setError("No API secret found. Please set it in the form above.");
			return;
		}

		setIsDeleting(true);
		setError(null);

		try {
			if (onDelete) {
				// Use the callback for optimistic updates with animation
				await onDelete(tweetId);
				setDialogOpen(false);
				setError(null);
			} else {
				// Fallback to original behavior
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

				setDialogOpen(false);
				setError(null);
				router.refresh();
			}
		} catch (error) {
			setError(
				error instanceof Error ? error.message : "Failed to delete tweet",
			);
			setIsDeleting(false);
		}
	};

	return (
		<div className="flex flex-col items-center space-y-1 w-full">
			{/* Submitter badges */}
			<div className="w-full max-w-[550px] flex flex-wrap gap-2 justify-start mb-1">
				{submittedBy.length > 0 ? (
					submittedBy.map((poster) => (
						<span
							key={poster}
							className="py-1 px-2 text-xs rounded-full bg-muted text-muted-foreground"
						>
							Saved by: {poster.charAt(0).toUpperCase() + poster.slice(1)}
						</span>
					))
				) : (
					<span className="py-1 px-2 text-xs rounded-full bg-muted text-muted-foreground">
						Saved by: Unknown
					</span>
				)}
			</div>

			{/* Tweet display with conditional styling for seen tweets */}
			<div
				className={`flex justify-center w-full tweet-container transition-all ${
					isSeen ? "max-h-24 overflow-hidden relative" : ""
				}`}
			>
				<Tweet id={tweetId} />
				{isSeen && (
					<div className="absolute inset-0 bg-gradient-to-b from-transparent pointer-events-none to-background" />
				)}
			</div>

			{/* Action buttons below the tweet - constrained to tweet width */}
			<div className="w-full max-w-[550px] flex justify-end gap-2">
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

				<AlertDialog
					open={dialogOpen}
					onOpenChange={(open) => {
						setDialogOpen(open);
						if (!open) setError(null);
					}}
				>
					<AlertDialogTrigger asChild>
						<Button
							variant="outline"
							size="icon-sm"
							disabled={isDeleting}
							onClick={() => setDialogOpen(true)}
						>
							<Trash2 className="w-4 h-4 text-destructive" />
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete Tweet</AlertDialogTitle>
							<AlertDialogDescription>
								Are you sure you want to delete this tweet? This action cannot
								be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						{error && (
							<div className="p-2 text-xs text-red-600 bg-red-50 rounded dark:bg-red-900/20">
								{error}
							</div>
						)}
						<AlertDialogFooter>
							<AlertDialogCancel
								onClick={() => {
									setDialogOpen(false);
									setError(null);
								}}
								disabled={isDeleting}
							>
								Cancel
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDelete}
								disabled={isDeleting}
								type="button"
								aria-label="Delete tweet"
								className="bg-destructive text-white hover:bg-destructive/90"
							>
								{isDeleting ? "Deleting..." : "Delete"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>

			{/* Error display for seen status toggle */}
			{error && !dialogOpen && (
				<div className="w-full max-w-[550px]">
					<p className="p-2 text-xs text-red-600 bg-red-50 rounded dark:bg-red-900/20">
						{error}
					</p>
				</div>
			)}
		</div>
	);
}
