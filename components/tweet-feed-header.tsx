"use client";

import { AddTweetDialog } from "@/components/add-tweet-dialog";
import { ApiSecretDialog } from "@/components/api-secret-dialog";
import { ThemeToggle } from "@/components/theme-toggle";

export function TweetFeedHeader() {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-[550px] items-center justify-between px-4 py-4">
        <h1 className="font-bold text-2xl tracking-tight">Tweet Feed</h1>
        <div className="flex items-center gap-2">
          <ApiSecretDialog />
          <AddTweetDialog />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
