"use client"

/**
 * Tweet submission form component
 * Allows users to submit tweet URLs to be added to the feed
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface TweetSubmitFormProps {
  apiSecret?: string
}

const STORAGE_KEY = "tweet_api_secret"
const NAME_STORAGE_KEY = "tweet_submitter_name"

export function TweetSubmitForm({ apiSecret }: TweetSubmitFormProps) {
  const [url, setUrl] = useState("")
  const [secret, setSecret] = useState(apiSecret || "")
  const [submittedBy, setSubmittedBy] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rememberSecret, setRememberSecret] = useState(false)
  const [hasStoredSecret, setHasStoredSecret] = useState(false)
  const [showSecretField, setShowSecretField] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const router = useRouter()

  // Load stored values from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedSecret = localStorage.getItem(STORAGE_KEY)
      const storedName = localStorage.getItem(NAME_STORAGE_KEY)

      if (storedSecret) {
        setSecret(storedSecret)
        setHasStoredSecret(true)
        setRememberSecret(true)
      } else {
        setShowSecretField(true)
      }

      if (storedName) {
        setSubmittedBy(storedName)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    const secretToUse = secret.trim()

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
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add tweet")
      }

      // Save to localStorage if remember is checked and secret was valid
      if (rememberSecret && secretToUse && typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, secretToUse)
        setHasStoredSecret(true)
      }

      // Save name to localStorage for convenience
      if (submittedBy.trim() && typeof window !== "undefined") {
        localStorage.setItem(NAME_STORAGE_KEY, submittedBy.trim())
      }

      setMessage({
        type: "success",
        text: `Tweet added successfully!`,
      })
      setUrl("")

      // Refresh the page to show the new tweet
      setTimeout(() => {
        router.refresh()
      }, 500)
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to add tweet",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearSecret = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY)
      setSecret("")
      setHasStoredSecret(false)
      setRememberSecret(false)
      setShowSecretField(true)
      setMessage({
        type: "success",
        text: "API secret cleared from browser storage",
      })
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 border rounded-lg bg-card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Add a Tweet</h2>

        {/* API Secret Status */}
        {hasStoredSecret && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              API Secret Saved
            </span>
            <button
              type="button"
              onClick={handleClearSecret}
              className="text-xs text-gray-500 hover:text-red-600 underline"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="tweet-url" className="block text-sm font-medium mb-2">
            Tweet URL or ID
          </label>
          <input
            id="tweet-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://twitter.com/user/status/123... or just the ID"
            className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            required
            disabled={isSubmitting}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Paste a full Twitter/X URL or just the tweet ID
          </p>
        </div>

        <div>
          <label htmlFor="submitted-by" className="block text-sm font-medium mb-2">
            Your Name (Optional)
          </label>
          <input
            id="submitted-by"
            type="text"
            value={submittedBy}
            onChange={(e) => setSubmittedBy(e.target.value)}
            placeholder="e.g., Partner 1, Partner 2"
            className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSubmitting}
          />
        </div>

        {/* API Secret field - only show if not stored or user wants to change */}
        {!apiSecret && (showSecretField || !hasStoredSecret) && (
          <div>
            <label htmlFor="api-secret" className="block text-sm font-medium mb-2">
              API Secret
            </label>
            <input
              id="api-secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Enter your API secret"
              className="w-full px-4 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              required
              disabled={isSubmitting}
            />

            {/* Remember checkbox */}
            <div className="flex items-center gap-2 mt-2">
              <input
                id="remember-secret"
                type="checkbox"
                checked={rememberSecret}
                onChange={(e) => setRememberSecret(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label
                htmlFor="remember-secret"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Remember secret in this browser (stored locally)
              </label>
            </div>
          </div>
        )}

        {/* Show button to enter secret if one is stored */}
        {hasStoredSecret && !showSecretField && (
          <button
            type="button"
            onClick={() => setShowSecretField(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Change API secret
          </button>
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "Adding..." : "Add Tweet"}
        </button>
      </form>
    </div>
  )
}
