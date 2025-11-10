"use client"

/**
 * Tweet display with action buttons (delete)
 */

import { useState } from "react"
import { Tweet } from "react-tweet"
import { useRouter } from "next/navigation"

interface TweetWithActionsProps {
  tweetId: string
  apiSecret?: string
}

export function TweetWithActions({
  tweetId,
  apiSecret,
}: TweetWithActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [secret, setSecret] = useState(apiSecret || "")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleDelete = async () => {
    if (!secret && !apiSecret) {
      setError("Please enter API secret")
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/tweets/${tweetId}`, {
        method: "DELETE",
        headers: {
          "x-api-secret": secret || apiSecret || "",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete tweet")
      }

      // Refresh the page to update the list
      router.refresh()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to delete tweet",
      )
      setIsDeleting(false)
    }
  }

  return (
    <div className="relative w-full">
      <div className="tweet-container flex justify-center">
        {/* @ts-expect-error - React 19 compatibility issue with react-tweet */}
        <Tweet id={tweetId} />
      </div>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="absolute top-2 right-2 px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition-colors"
          disabled={isDeleting}
        >
          Delete
        </button>
      ) : (
        <div className="absolute top-2 right-2 bg-card border rounded-md p-3 shadow-lg">
          <p className="text-sm mb-2">Delete this tweet?</p>

          {!apiSecret && (
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="API Secret"
              className="w-full px-2 py-1 border rounded text-sm mb-2 bg-background"
              disabled={isDeleting}
            />
          )}

          {error && (
            <p className="text-xs text-red-600 mb-2">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Confirm"}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false)
                setError(null)
              }}
              disabled={isDeleting}
              className="px-3 py-1 bg-gray-300 dark:bg-gray-700 rounded text-sm hover:bg-gray-400 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
