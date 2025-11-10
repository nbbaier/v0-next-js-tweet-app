"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

interface TweetSubmitFormProps {
	apiSecret?: string;
}

const STORAGE_KEY = "tweet_api_secret";
const NAME_STORAGE_KEY = "tweet_submitter_name";
const FORM_COLLAPSED_KEY = "tweet_form_collapsed";

export function TweetSubmitForm({ apiSecret }: TweetSubmitFormProps) {
	const [url, setUrl] = useState("");
	const [secret, setSecret] = useState(apiSecret || "");
	const [submittedBy, setSubmittedBy] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [rememberSecret, setRememberSecret] = useState(false);
	const [hasStoredSecret, setHasStoredSecret] = useState(false);
	const [showSecretField, setShowSecretField] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [message, setMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);
	const router = useRouter();

	// Load stored values from localStorage on mount
	useEffect(() => {
		if (typeof window !== "undefined") {
			const storedSecret = localStorage.getItem(STORAGE_KEY);
			const storedName = localStorage.getItem(NAME_STORAGE_KEY);
			const storedCollapsed = localStorage.getItem(FORM_COLLAPSED_KEY);

			if (storedSecret) {
				setSecret(storedSecret);
				setHasStoredSecret(true);
				setRememberSecret(true);
			} else {
				setShowSecretField(true);
			}

			if (storedName) {
				setSubmittedBy(storedName);
			}

			if (storedCollapsed === "true") {
				setIsCollapsed(true);
			}
		}
	}, []);

	// Save collapsed state to localStorage when it changes
	const toggleCollapsed = () => {
		const newCollapsed = !isCollapsed;
		setIsCollapsed(newCollapsed);
		if (typeof window !== "undefined") {
			localStorage.setItem(FORM_COLLAPSED_KEY, String(newCollapsed));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);
		setMessage(null);

		const secretToUse = secret.trim();

		try {
			const response = await fetch("/api/tweets", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					url: url.trim(),
					secret: secretToUse,
					submittedBy: submittedBy.trim() || undefined,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to add tweet");
			}

			// Save to localStorage if remember is checked and secret was valid
			if (rememberSecret && secretToUse && typeof window !== "undefined") {
				localStorage.setItem(STORAGE_KEY, secretToUse);
				setHasStoredSecret(true);
			}

			// Save name to localStorage for convenience
			if (submittedBy.trim() && typeof window !== "undefined") {
				localStorage.setItem(NAME_STORAGE_KEY, submittedBy.trim());
			}

			setMessage({
				type: "success",
				text: `Tweet added successfully!`,
			});
			setUrl("");

			// Refresh the page to show the new tweet
			setTimeout(() => {
				router.refresh();
			}, 500);
		} catch (error) {
			setMessage({
				type: "error",
				text: error instanceof Error ? error.message : "Failed to add tweet",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleClearSecret = () => {
		if (typeof window !== "undefined") {
			localStorage.removeItem(STORAGE_KEY);
			setSecret("");
			setHasStoredSecret(false);
			setRememberSecret(false);
			setShowSecretField(true);
			setMessage({
				type: "success",
				text: "API secret cleared from browser storage",
			});
		}
	};

	return (
		<div className="w-full max-w-2xl mx-auto border rounded-lg bg-card transition-all">
			{/* Header with collapse toggle */}
			<div className="flex justify-between items-center p-6 pb-0">
				<div className="flex items-center gap-3">
					<h2 className="text-xl font-semibold">Add a Tweet</h2>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						onClick={toggleCollapsed}
						className="text-muted-foreground hover:text-foreground"
						aria-label={isCollapsed ? "Expand form" : "Collapse form"}
					>
						{isCollapsed ? (
							<ChevronDown className="h-4 w-4" />
						) : (
							<ChevronUp className="h-4 w-4" />
						)}
					</Button>
					{isCollapsed && (
						<span className="text-sm text-muted-foreground">
							Click to expand and add a tweet
						</span>
					)}
				</div>

				{/* API Secret Status */}
				{hasStoredSecret && !isCollapsed && (
					<div className="flex items-center gap-2 text-sm">
						<span className="text-green-600 dark:text-green-400 flex items-center gap-1">
							<CheckCircle2 className="h-4 w-4" />
							API Secret Saved
						</span>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={handleClearSecret}
							className="text-xs h-auto px-2 py-1 text-muted-foreground hover:text-destructive"
						>
							Clear
						</Button>
					</div>
				)}
			</div>

			{/* Form content - conditionally rendered */}
			{!isCollapsed && (
				<form onSubmit={handleSubmit} className="space-y-6 p-6 pt-6">
				<Field>
					<FieldLabel htmlFor="tweet-url">Tweet URL or ID</FieldLabel>
					<Input
						id="tweet-url"
						type="text"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						placeholder="https://twitter.com/user/status/123... or just the ID"
						required
						disabled={isSubmitting}
					/>
					<FieldDescription>
						Paste a full Twitter/X URL or just the tweet ID
					</FieldDescription>
				</Field>

				<Field>
					<FieldLabel htmlFor="submitted-by">Your Name</FieldLabel>
					<Input
						id="submitted-by"
						type="text"
						value={submittedBy}
						onChange={(e) => setSubmittedBy(e.target.value)}
						placeholder="e.g., Nico, Rebecca"
						disabled={isSubmitting}
					/>
					<FieldDescription>
						Optional - helps identify who added the tweet
					</FieldDescription>
				</Field>

				{/* API Secret field - only show if not stored or user wants to change */}
				{!apiSecret && (showSecretField || !hasStoredSecret) && (
					<div className="space-y-4">
						<Field>
							<FieldLabel htmlFor="api-secret">API Secret</FieldLabel>
							<Input
								id="api-secret"
								type="password"
								value={secret}
								onChange={(e) => setSecret(e.target.value)}
								placeholder="Enter your API secret"
								required
								disabled={isSubmitting}
							/>
							<FieldDescription>
								The shared secret to authenticate your submission
							</FieldDescription>
						</Field>

						{/* Remember checkbox */}
						<div className="flex items-center space-x-2">
							<Checkbox
								id="remember-secret"
								checked={rememberSecret}
								onCheckedChange={(checked) =>
									setRememberSecret(checked === true)
								}
							/>
							<Label
								htmlFor="remember-secret"
								className="text-sm font-normal text-muted-foreground cursor-pointer"
							>
								Remember secret in this browser (stored locally)
							</Label>
						</div>
					</div>
				)}

				{/* Show button to enter secret if one is stored */}
				{hasStoredSecret && !showSecretField && (
					<Button
						type="button"
						variant="link"
						size="sm"
						onClick={() => setShowSecretField(true)}
						className="h-auto p-0"
					>
						Change API secret
					</Button>
				)}

				{message && (
					<div
						className={`p-4 rounded-md ${
							message.type === "success"
								? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
								: "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
						}`}
					>
						{message.text}
					</div>
				)}

					<Button type="submit" disabled={isSubmitting} className="w-full">
						{isSubmitting ? "Adding..." : "Add Tweet"}
					</Button>
				</form>
			)}

			{/* Add padding when collapsed */}
			{isCollapsed && <div className="pb-6" />}
		</div>
	);
}
