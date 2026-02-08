"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
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
  onSuccess?: () => void;
}

const STORAGE_KEY = "tweet_api_secret";
const NAME_STORAGE_KEY = "tweet_submitter_name";

export function TweetSubmitForm({
  apiSecret,
  onSuccess,
}: TweetSubmitFormProps) {
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState(apiSecret || "");
  const [submittedBy, setSubmittedBy] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberSecret, setRememberSecret] = useState(false);
  const [hasStoredSecret, setHasStoredSecret] = useState(false);
  const [isLoadingSecret, setIsLoadingSecret] = useState(true);
  const [showSecretField, setShowSecretField] = useState(false);
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

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Meta+Enter (Cmd+Enter on Mac, Ctrl+Enter on Windows/Linux) to submit
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      const form = e.currentTarget as HTMLFormElement;
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
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
        text: "Tweet added successfully!",
      });
      setUrl("");

      // Call onSuccess callback if provided
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          router.refresh();
        }, 500);
      } else {
        // Refresh the page to show the new tweet
        setTimeout(() => {
          router.refresh();
        }, 500);
      }
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
    <div className="w-full">
      {/* API Secret Status */}
      {!isLoadingSecret && (
        <div className="mb-4">
          <Badge
            className={` ${
              hasStoredSecret
                ? "border-green-500 bg-green-500 text-white dark:border-green-400 dark:bg-green-400"
                : ""
            }`}
            variant={hasStoredSecret ? "default" : "destructive"}
          >
            {hasStoredSecret ? (
              <>
                <CheckCircle2 aria-hidden="true" />
                API Secret stored
              </>
            ) : (
              <>
                <XCircle aria-hidden="true" />
                API Secret not stored
              </>
            )}
          </Badge>
        </div>
      )}
      {isLoadingSecret && (
        <div className="mb-4">
          <Badge className="pt-[2px]" variant="outline">
            <Loader2 aria-hidden="true" className="animate-spin" />
            Loading…
          </Badge>
        </div>
      )}

      {/* Form content */}
      {
        <form className="space-y-6" onSubmit={handleSubmit}>
          <Field>
            <FieldLabel className="pl-1" htmlFor="tweet-url">
              Tweet URL
            </FieldLabel>
            <Input
              autoComplete="off"
              disabled={isSubmitting}
              id="tweet-url"
              inputMode="url"
              name="tweet-url"
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste a full Twitter/X URL (e.g., https://x.com/user/status/123)…"
              required
              type="url"
              value={url}
            />
          </Field>

          <Field>
            <FieldLabel className="pl-1" htmlFor="submitted-by">
              Your Name
            </FieldLabel>
            <Select
              disabled={isSubmitting}
              name="submitted-by"
              onValueChange={(value: string | null) => {
                if (value) {
                  setSubmittedBy(value);
                  if (typeof window !== "undefined") {
                    localStorage.setItem(NAME_STORAGE_KEY, value);
                  }
                }
              }}
              required
              value={submittedBy || undefined}
            >
              <SelectTrigger id="submitted-by">
                <SelectValue placeholder="Select a name…" />
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
                <FieldLabel className="pl-1" htmlFor="api-secret">
                  API Secret
                </FieldLabel>
                <div className="flex gap-2">
                  <Input
                    autoComplete="off"
                    className="flex-1"
                    disabled={isSubmitting}
                    id="api-secret"
                    name="api-secret"
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Enter your API secret…"
                    required
                    type="password"
                    value={secret}
                  />
                  <Button
                    className="h-10"
                    disabled={isSubmitting || !secret.trim()}
                    onClick={handleSaveSecret}
                    size="sm"
                    type="button"
                    variant="outline"
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
                  checked={rememberSecret}
                  id="remember-secret"
                  onCheckedChange={(checked: boolean) =>
                    setRememberSecret(checked)
                  }
                />
                <Label
                  className="cursor-pointer font-normal text-muted-foreground text-sm"
                  htmlFor="remember-secret"
                >
                  Remember secret in this browser (stored locally)
                </Label>
              </div>
            </div>
          )}

          {/* Show button to enter secret if one is stored */}
          {hasStoredSecret && !showSecretField && (
            <Button
              className="h-auto p-0 pl-1"
              onClick={() => setShowSecretField(true)}
              size="sm"
              type="button"
              variant="link"
            >
              Change API secret
            </Button>
          )}

          {message && (
            <output
              aria-live="polite"
              className={`block rounded-md p-4 ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {message.text}
            </output>
          )}

          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Adding…" : "Add Tweet"}
          </Button>
        </form>
      }
    </div>
  );
}
