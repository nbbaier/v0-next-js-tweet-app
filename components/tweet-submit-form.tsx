"use client"

/**
 * Tweet submission form component
 * Allows users to submit tweet URLs to be added to the feed
 */

import { useState } from "react"
import { useRouter } from "next/navigation"

interface TweetSubmitFormProps {
  apiSecret?: string
}

export function TweetSubmitForm({ apiSecret }: TweetSubmitFormProps) {
  const [url, setUrl] = useState("")
  const [secret, setSecret] = useState(apiSecret || "")
  const [submittedBy, setSubmittedBy] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch("/api/tweets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: url.trim(),
          secret: secret.trim(),
          submittedBy: submittedBy.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to add tweet")
      }

      setMessage({
        type: "success",
        text: `Tweet added successfully! ID: ${data.tweetId}`,
      })
      setUrl("")
      setSubmittedBy("")

      // Refresh the page to show the new tweet
      router.refresh()
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to add tweet",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 border rounded-lg bg-card">
      <h2 className="text-2xl font-semibold mb-4">Add a Tweet</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="tweet-url"
            className="block text-sm font-medium mb-2"
          >
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

        {!apiSecret && (
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
            <p className="text-sm text-muted-foreground mt-1">
              The shared secret to authenticate your submission
            </p>
          </div>
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
