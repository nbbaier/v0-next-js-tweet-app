# Saved Feed Tweaks Plan

## File to modify
- `components/filterable-tweet-feed.tsx`

## Changes

### 1. Move Feed/Saved toggle inline with filter badges
Replace the current two-row layout (Feed/Saved buttons on top row, filter badges on second row) with a single row where Feed/Saved buttons sit on the same line as the filter badges (All, Nico, Rebecca, Hide Seen).

### 2. Exclude saved tweets from the feed view
Add a `feedTweets` memo that filters out `saved === true` tweets. Use `feedTweets` instead of `tweets` for `sortedTweets`, `unseenCounts`, and `filteredTweets`. This makes the two views mutually exclusive — saving a tweet removes it from the feed.

### 3. Compute counts per-view
- Feed view: `unseenCounts` only counts non-saved tweets
- Saved view: new `savedCounts` memo with per-person totals over saved tweets
- Show the appropriate person filter badges with correct counts on each view

### 4. Show filter badges on saved view too (without Hide Seen)
Currently filter badges are hidden on the saved tab. Show All/person badges on both views, but only show the "Hide Seen" toggle on the feed view.

### 5. Remove seen-related actions from saved view
Don't pass `onToggleSeen` to the saved TweetList.

## Verification
1. `pnpm build` — no type/build errors
2. `pnpm dev` — manually verify:
   - Feed/Saved toggle appears inline with filter badges
   - Saved tweets don't appear in feed view
   - Counts reflect correct view
   - Person filters work on both views
   - Hide Seen only appears on feed view
   - Saving a tweet moves it from feed to saved
