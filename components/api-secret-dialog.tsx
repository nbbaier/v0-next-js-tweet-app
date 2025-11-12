"use client";

import { CheckCircle2, Key, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "tweet_api_secret";

export function ApiSecretDialog() {
	const [open, setOpen] = useState(false);
	const [secret, setSecret] = useState("");
	const [rememberSecret, setRememberSecret] = useState(false);
	const [hasStoredSecret, setHasStoredSecret] = useState(false);
	const [message, setMessage] = useState<{
		type: "success" | "error";
		text: string;
	} | null>(null);

	// Load stored value from localStorage on mount
	useEffect(() => {
		if (typeof window !== "undefined") {
			const storedSecret = localStorage.getItem(STORAGE_KEY);
			if (storedSecret) {
				setSecret(storedSecret);
				setHasStoredSecret(true);
				setRememberSecret(true);
			}
		}
	}, []);

	const handleSave = () => {
		const secretToUse = secret.trim();
		if (!secretToUse) {
			setMessage({
				type: "error",
				text: "Please enter an API secret to save",
			});
			return;
		}

		if (typeof window !== "undefined" && rememberSecret) {
			localStorage.setItem(STORAGE_KEY, secretToUse);
			setHasStoredSecret(true);
			setMessage({
				type: "success",
				text: "API secret saved successfully!",
			});

			setTimeout(() => {
				setOpen(false);
				setMessage(null);
			}, 1000);
		}
	};

	const handleClear = () => {
		if (typeof window !== "undefined") {
			localStorage.removeItem(STORAGE_KEY);
			setSecret("");
			setHasStoredSecret(false);
			setRememberSecret(false);
			setMessage({
				type: "success",
				text: "API secret cleared successfully!",
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" variant="outline">
					<Key className="w-4 h-4" />
					{hasStoredSecret ? (
						<CheckCircle2 className="w-3 h-3 text-green-500" />
					) : (
						<XCircle className="w-3 h-3 text-red-500" />
					)}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Manage API Secret</DialogTitle>
					<DialogDescription>
						Configure your API secret for submitting tweets. This is stored
						locally in your browser.
					</DialogDescription>
				</DialogHeader>

				<div className="pt-4 space-y-4">
					<Field>
						<FieldLabel htmlFor="api-secret">API Secret</FieldLabel>
						<Input
							id="api-secret"
							type="password"
							value={secret}
							onChange={(e) => setSecret(e.target.value)}
							placeholder="Enter your API secret"
						/>
						<FieldDescription>
							The shared secret to authenticate your submission
						</FieldDescription>
					</Field>

					<div className="flex items-center space-x-2">
						<Checkbox
							id="remember-secret"
							checked={rememberSecret}
							onCheckedChange={(checked) => setRememberSecret(checked === true)}
						/>
						<Label
							htmlFor="remember-secret"
							className="text-sm font-normal cursor-pointer text-muted-foreground"
						>
							Remember secret in this browser (stored locally)
						</Label>
					</div>

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

					<div className="flex gap-2">
						<Button onClick={handleSave} className="flex-1">
							Save Secret
						</Button>
						{hasStoredSecret && (
							<Button onClick={handleClear} variant="destructive">
								Clear
							</Button>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
