"use client";

import { Bookmark, BookmarkCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useEffect, useState } from "react";
import { EmbeddedTweet, Tweet } from "react-tweet";
import type { Tweet as TweetType } from "react-tweet/api";
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
  apiSecret?: string;
  content?: TweetType;
  onDelete?: (tweetId: string) => Promise<void>;
  onToggleSaved?: (
    tweetId: string,
    currentSavedStatus: boolean
  ) => Promise<void>;
  onToggleSeen?: (tweetId: string, currentSeenStatus: boolean) => Promise<void>;
  saved?: boolean;
  savedAt?: number; // Unix timestamp of when tweet was first saved
  seen?: boolean;
  submittedBy: string[]; // Array of poster names
  tweetId: string;
}

function formatSavedAt(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TweetWithActionsComponent({
  tweetId,
  submittedBy,
  savedAt,
  seen: initialSeen = false,
  saved: initialSaved = false,
  content,
  apiSecret,
  onToggleSeen,
  onToggleSaved,
  onDelete,
}: TweetWithActionsProps) {
  const [error, setError] = useState<string | null>(null);
  const [isTogglingSavedStatus, setIsTogglingSavedStatus] = useState(false);
  const [isTogglingSeenStatus, setIsTogglingSeenStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [storedSecret, setStoredSecret] = useState<string>("");
  const isSeen = initialSeen;
  const isSaved = initialSaved;
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("tweet_api_secret");
      if (saved) {
        setStoredSecret(saved);
      }
    }
  }, []);

  const handleToggleSaved = async () => {
    setIsTogglingSavedStatus(true);
    setError(null);

    try {
      if (onToggleSaved) {
        await onToggleSaved(tweetId, isSaved);
      } else {
        const secretToUse = apiSecret || storedSecret;
        const response = await fetch(`/api/tweets/${tweetId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(secretToUse ? { "x-api-secret": secretToUse } : {}),
          },
          body: JSON.stringify({ saved: !isSaved }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update saved status");
        }

        router.refresh();
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to update saved status"
      );
    } finally {
      setIsTogglingSavedStatus(false);
    }
  };

  const handleToggleSeen = async () => {
    setIsTogglingSeenStatus(true);
    setError(null);

    try {
      if (onToggleSeen) {
        // Use the callback for optimistic updates with animation
        await onToggleSeen(tweetId, isSeen);
      } else {
        // Fallback to original behavior
        const secretToUse = apiSecret || storedSecret;
        const response = await fetch(`/api/tweets/${tweetId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(secretToUse ? { "x-api-secret": secretToUse } : {}),
          },
          body: JSON.stringify({ seen: !isSeen }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to update seen status");
        }

        router.refresh();
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to update seen status"
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
        error instanceof Error ? error.message : "Failed to delete tweet"
      );
      setIsDeleting(false);
    }
  };

  const seenButtonLabel = isSeen ? "Mark as Unseen" : "Mark as Seen";

  return (
    <div className="flex w-full flex-col items-center space-y-1">
      {/* Submitter badges */}
      <div className="mb-1 flex w-full max-w-[550px] flex-wrap items-center justify-start gap-2">
        {submittedBy.length > 0 ? (
          submittedBy.map((poster) => (
            <span
              className="rounded-full bg-muted px-2 py-1 text-muted-foreground text-xs"
              key={poster}
            >
              Saved by: {poster.charAt(0).toUpperCase() + poster.slice(1)}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground text-xs">
            Saved by: Unknown
          </span>
        )}
        {savedAt && (
          <span className="text-muted-foreground/70 text-xs">
            {formatSavedAt(savedAt)}
          </span>
        )}
      </div>

      {/* Tweet display with conditional styling for seen tweets */}
      <div
        className={`tweet-container flex w-full justify-center transition-[max-height] duration-300 ${
          isSeen ? "relative max-h-24 overflow-hidden" : ""
        }`}
      >
        {content ? <EmbeddedTweet tweet={content} /> : <Tweet id={tweetId} />}
        {isSeen && (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        )}
      </div>

      {/* Action buttons below the tweet - constrained to tweet width */}
      <div className="flex w-full max-w-[550px] justify-end gap-2">
        <Button
          aria-label={isSaved ? "Unsave tweet" : "Save tweet"}
          disabled={isTogglingSavedStatus}
          onClick={handleToggleSaved}
          size="icon-sm"
          variant="outline"
        >
          {isSaved ? (
            <BookmarkCheck
              aria-hidden="true"
              className="h-4 w-4 text-primary"
            />
          ) : (
            <Bookmark aria-hidden="true" className="h-4 w-4" />
          )}
        </Button>
        {onToggleSeen && (
          <Button
            disabled={isTogglingSeenStatus}
            onClick={handleToggleSeen}
            size="sm"
            variant="outline"
          >
            {isTogglingSeenStatus ? "Updating…" : seenButtonLabel}
          </Button>
        )}

        <AlertDialog
          onOpenChange={(open: boolean) => {
            setDialogOpen(open);
            if (!open) {
              setError(null);
            }
          }}
          open={dialogOpen}
        >
          <AlertDialogTrigger
            render={
              <Button
                aria-label="Delete tweet"
                disabled={isDeleting}
                size="icon-sm"
                variant="outline"
              />
            }
          >
            <Trash2 aria-hidden="true" className="h-4 w-4 text-destructive" />
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
              <output
                aria-live="polite"
                className="block rounded bg-red-50 p-2 text-red-600 text-xs dark:bg-red-900/20"
              >
                {error}
              </output>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={isDeleting}
                onClick={() => {
                  setDialogOpen(false);
                  setError(null);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                aria-label="Delete tweet"
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={isDeleting}
                onClick={handleDelete}
                type="button"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Error display for seen status toggle */}
      {error && !dialogOpen && (
        <div className="w-full max-w-[550px]">
          <output
            aria-live="polite"
            className="block rounded bg-red-50 p-2 text-red-600 text-xs dark:bg-red-900/20"
          >
            {error}
          </output>
        </div>
      )}
    </div>
  );
}

function arePropsEqual(
  prevProps: TweetWithActionsProps,
  nextProps: TweetWithActionsProps
) {
  if (prevProps.tweetId !== nextProps.tweetId) {
    return false;
  }
  if (prevProps.seen !== nextProps.seen) {
    return false;
  }
  if (prevProps.saved !== nextProps.saved) {
    return false;
  }
  if (prevProps.savedAt !== nextProps.savedAt) {
    return false;
  }
  if (prevProps.apiSecret !== nextProps.apiSecret) {
    return false;
  }
  // Functions are stable if using useCallback properly, but we check them anyway
  if (prevProps.onToggleSeen !== nextProps.onToggleSeen) {
    return false;
  }
  if (prevProps.onToggleSaved !== nextProps.onToggleSaved) {
    return false;
  }
  if (prevProps.onDelete !== nextProps.onDelete) {
    return false;
  }

  if (prevProps.content !== nextProps.content) {
    if (!(prevProps.content && nextProps.content)) {
      return false;
    }
    if (prevProps.content.id_str !== nextProps.content.id_str) {
      return false;
    }
  }

  // Deep compare submittedBy array content
  if (prevProps.submittedBy === nextProps.submittedBy) {
    return true;
  }
  if (prevProps.submittedBy.length !== nextProps.submittedBy.length) {
    return false;
  }

  for (let i = 0; i < prevProps.submittedBy.length; i++) {
    if (prevProps.submittedBy[i] !== nextProps.submittedBy[i]) {
      return false;
    }
  }

  return true;
}

// Add display name for debugging
TweetWithActionsComponent.displayName = "TweetWithActions";

export const TweetWithActions = memo(TweetWithActionsComponent, arePropsEqual);
