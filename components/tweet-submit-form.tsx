"use client";

import {
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Loader2,
	XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface TweetSubmitFormProps {
	apiSecret?: string;
}

const STORAGE_KEY = "tweet_api_secret";
const NAME_STORAGE_KEY = "tweet_submitter_name";

export function TweetSubmitForm({ apiSecret }: TweetSubmitFormProps) {
	const [url, setUrl] = useState("");
	const [secret, setSecret] = useState(apiSecret || "");
	const [submittedBy, setSubmittedBy] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [rememberSecret, setRememberSecret] = useState(false);
	const [hasStoredSecret, setHasStoredSecret] = useState(false);
	const [isLoadingSecret, setIsLoadingSecret] = useState(true);
	const [showSecretField, setShowSecretField] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(true);
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
		}
		setIsLoadingSecret(false);
	}, []);

	const toggleCollapsed = () => {
		setIsCollapsed(!isCollapsed);
	};

	// Handle keyboard shortcuts
	const handleKeyDown = (e: React.KeyboardEvent) => {
		// Meta+Enter (Cmd+Enter on Mac, Ctrl+Enter on Windows/Linux) to submit
		if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
			e.preventDefault();
			const form = e.currentTarget as HTMLFormElement;
			form.dispatchEvent(
				new Event("submit", { bubbles: true, cancelable: true }),
			);
		}
	};

	const handleSaveSecret = () => {
		const secretToUse = secret.trim();
		if (!secretToUse) {
			setMessage({
				type: "error",
				text: "Please enter an API secret to save",
			});
			return;
		}

		if (typeof window !== "undefined") {
			localStorage.setItem(STORAGE_KEY, secretToUse);
			setHasStoredSecret(true);
			setRememberSecret(true);
			setMessage({
				type: "success",
				text: "API secret saved successfully!",
			});
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

	return (
		<div className="w-full max-w-[550px] mx-auto border border-border rounded-lg bg-card transition-all">
			{/* Header with collapse toggle */}
			<div className="flex justify-between items-center p-6 pb-0">
				<div className="flex items-center gap-3">
					<h2 className="text-xl font-semibold -mr-1.5">Add a Tweet</h2>
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
				</div>

				{/* API Secret Status */}
				{!isLoadingSecret && (
					<Badge
						variant={hasStoredSecret ? "default" : "destructive"}
						className={` ${
							hasStoredSecret
								? "bg-green-500 text-white border-green-500 dark:bg-green-400 dark:border-green-400"
								: ""
						}`}
					>
						{hasStoredSecret ? (
							<>
								<CheckCircle2 />
								API Secret stored
							</>
						) : (
							<>
								<XCircle />
								API Secret not stored
							</>
						)}
					</Badge>
				)}
				{isLoadingSecret && (
					<Badge variant="outline" className="pt-[2px]">
						<Loader2 className="animate-spin" />
						Loading...
					</Badge>
				)}
			</div>

			{/* Form content - conditionally rendered */}
			{!isCollapsed && (
				<form
					onSubmit={handleSubmit}
					onKeyDown={handleKeyDown}
					className="space-y-6 p-6 pt-6"
				>
					<Field>
						<FieldLabel htmlFor="tweet-url" className="pl-1">
							Tweet URL or ID
						</FieldLabel>
						<Input
							id="tweet-url"
							type="text"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="Paste a full Twitter/X URL or just the tweet ID"
							required
							disabled={isSubmitting}
						/>
					</Field>

					<Field>
						<FieldLabel htmlFor="submitted-by" className="pl-1">
							Your Name
						</FieldLabel>
						<Select
							value={submittedBy || undefined}
							onValueChange={(value) => {
								setSubmittedBy(value);
								if (typeof window !== "undefined") {
									localStorage.setItem(NAME_STORAGE_KEY, value);
								}
							}}
							required
							disabled={isSubmitting}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select a name" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Nico">Nico</SelectItem>
								<SelectItem value="Rebecca">Rebecca</SelectItem>
							</SelectContent>
						</Select>
					</Field>

					{/* API Secret field - only show if not stored or user wants to change */}
					{!apiSecret && (showSecretField || !hasStoredSecret) && (
						<div className="space-y-4">
							<Field>
								<FieldLabel htmlFor="api-secret" className="pl-1">
									API Secret
								</FieldLabel>
								<div className="flex gap-2">
									<Input
										id="api-secret"
										type="password"
										value={secret}
										onChange={(e) => setSecret(e.target.value)}
										placeholder="Enter your API secret"
										required
										disabled={isSubmitting}
										className="flex-1"
									/>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={handleSaveSecret}
										disabled={isSubmitting || !secret.trim()}
										className="h-10"
									>
										Save Secret
									</Button>
								</div>
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
							className="h-auto p-0 pl-1"
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
