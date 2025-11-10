/**
 * Tweet configuration
 * Hard-coded IDs for development
 * Replace with API call or database query in production
 */

export const DEVELOPMENT_TWEET_IDS = ["1987941484176560364", "1987794603982938338", "1987940762143826419"]

/**
 * Get tweet IDs based on environment
 * In production, replace with:
 * - Database query
 * - API call
 * - External data source
 */
export async function getTweetIds(): Promise<string[]> {
  // For production, implement like:
  // const response = await fetch('/api/tweets');
  // return response.json();

  return DEVELOPMENT_TWEET_IDS
}
