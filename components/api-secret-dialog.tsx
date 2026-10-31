"use client";

import { CheckCircle2, Key, XCircle } from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useState } from "react";
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

  const handleSave = useCallback(() => {
    const secretToUse = secret.trim();
    if (!secretToUse) {
      setMessage({
        text: "Please enter an API secret to save",
        type: "error",
      });
      return;
    }

    if (typeof window !== "undefined" && rememberSecret) {
      localStorage.setItem(STORAGE_KEY, secretToUse);
      setHasStoredSecret(true);
      setMessage({
        text: "API secret saved successfully!",
        type: "success",
      });

      setTimeout(() => {
        setOpen(false);
        setMessage(null);
      }, 1000);
    }
  }, [rememberSecret, secret]);

  const handleClear = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
      setSecret("");
      setHasStoredSecret(false);
      setRememberSecret(false);
      setMessage({
        text: "API secret cleared successfully!",
        type: "success",
      });
    }
  }, []);

  const handleSecretChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setSecret(e.target.value),
    []
  );

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button aria-label="Manage API secret" size="sm" variant="outline" />
        }
      >
        <Key aria-hidden="true" className="h-4 w-4" />
        {hasStoredSecret ? (
          <CheckCircle2 aria-hidden="true" className="h-3 w-3 text-green-500" />
        ) : (
          <XCircle aria-hidden="true" className="h-3 w-3 text-red-500" />
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage API Secret</DialogTitle>
          <DialogDescription>
            Configure your API secret for submitting tweets. This is stored
            locally in your browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <Field>
            <FieldLabel htmlFor="api-secret">API Secret</FieldLabel>
            <Input
              autoComplete="off"
              id="api-secret"
              name="api-secret"
              onChange={handleSecretChange}
              placeholder="Enter your API secret…"
              type="password"
              value={secret}
            />
            <FieldDescription>
              The shared secret to authenticate your submission
            </FieldDescription>
          </Field>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={rememberSecret}
              id="remember-secret"
              onCheckedChange={setRememberSecret}
            />
            <Label
              className="cursor-pointer font-normal text-muted-foreground text-sm"
              htmlFor="remember-secret"
            >
              Remember secret in this browser (stored locally)
            </Label>
          </div>

          {message ? (
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
          ) : null}

          <div className="flex gap-2">
            <Button className="flex-1" onClick={handleSave}>
              Save Secret
            </Button>
            {hasStoredSecret ? (
              <Button onClick={handleClear} variant="destructive">
                Clear
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
