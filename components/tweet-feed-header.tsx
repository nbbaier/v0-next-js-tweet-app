"use client";

import { AddTweetDialog } from "@/components/add-tweet-dialog";
import { ApiSecretDialog } from "@/components/api-secret-dialog";
import { ThemeToggle } from "@/components/theme-toggle";

export function TweetFeedHeader() {
	return (
		<div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
			<div className="mx-auto max-w-[550px] py-4 flex justify-between items-center">
				<h1 className="text-2xl font-bold tracking-tight">Tweet Feed</h1>
				<div className="flex items-center gap-2">
					<ApiSecretDialog />
					<AddTweetDialog />
					<ThemeToggle />
				</div>
			</div>
		</div>
	);
}
