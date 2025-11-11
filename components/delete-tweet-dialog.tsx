"use client";

import { X } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui/button";

interface DeleteTweetDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => void;
	isDeleting: boolean;
	error?: string | null;
}

export function DeleteTweetDialog({
	open,
	onOpenChange,
	onConfirm,
	isDeleting,
	error,
}: DeleteTweetDialogProps) {
	const overlayRef = useRef<HTMLDivElement>(null);

	// Handle escape key
	useEffect(() => {
		if (!open) return;

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onOpenChange(false);
			}
		};

		document.addEventListener("keydown", handleEscape);
		return () => document.removeEventListener("keydown", handleEscape);
	}, [open, onOpenChange]);

	// Lock body scroll when dialog is open
	useEffect(() => {
		if (open) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [open]);

	if (!open) return null;

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === overlayRef.current) {
			onOpenChange(false);
		}
	};

	return createPortal(
		<div
			ref={overlayRef}
			onClick={handleOverlayClick}
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-in fade-in-0 p-4"
		>
			<div
				className="relative w-full max-w-md bg-background border rounded-lg shadow-lg animate-in zoom-in-95 fade-in-0"
				role="dialog"
				aria-modal="true"
				aria-labelledby="dialog-title"
			>
				{/* Close button */}
				<button
					type="button"
					onClick={() => onOpenChange(false)}
					disabled={isDeleting}
					className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
					aria-label="Close"
				>
					<X className="h-4 w-4" />
				</button>

				{/* Content */}
				<div className="p-6">
					{/* Header */}
					<div className="mb-4">
						<h2
							id="dialog-title"
							className="text-lg font-semibold leading-none tracking-tight mb-2"
						>
							Delete Tweet
						</h2>
						<p className="text-sm text-muted-foreground">
							Are you sure you want to delete this tweet? This action cannot be
							undone.
						</p>
					</div>

					{/* Error message */}
					{error && (
						<div className="mb-4 p-2 text-xs text-red-600 bg-red-50 rounded dark:bg-red-900/20">
							{error}
						</div>
					)}

					{/* Footer */}
					<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isDeleting}
							className="w-full sm:w-auto"
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={onConfirm}
							disabled={isDeleting}
							className="w-full sm:w-auto"
						>
							{isDeleting ? "Deleting..." : "Delete"}
						</Button>
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
