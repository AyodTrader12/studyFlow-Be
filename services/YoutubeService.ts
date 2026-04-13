// server/src/services/youtubeService.ts
// Fixed version with better error handling and URL format support.
// Supports: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/

import type { YouTubeMetadata } from "../types/index";

interface YouTubeApiItem {
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      high?:    { url: string };
      medium?:  { url: string };
      default?: { url: string };
    };
  };
  contentDetails: { duration: string };
  statistics:     { viewCount?: string };
}

interface YouTubeApiResponse {
  items?: YouTubeApiItem[];
  error?: { message: string; code: number };
}

export async function fetchYouTubeMetadata(url: string): Promise<YouTubeMetadata> {
  const videoId = extractVideoId(url);

  if (!videoId) {
    throw new Error(
      "Invalid YouTube URL. Use format: youtube.com/watch?v=VIDEO_ID or youtu.be/VIDEO_ID"
    );
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is not set in environment variables");
  }

  const apiUrl =
    `https://www.googleapis.com/youtube/v3/videos` +
    `?part=snippet,contentDetails,statistics` +
    `&id=${videoId}` +
    `&key=${apiKey}`;

  console.log(`[YouTubeService] Full API URL: ${apiUrl}`);

  let res: Response;
  try {
    console.log(`[YouTubeService] Making fetch request...`);
    res = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'StudyFlow-API/1.0'
      }
    });
    console.log(`[YouTubeService] Fetch completed with status: ${res.status}`);
  } catch (error) {
    console.error(`[YouTubeService] Fetch failed with error:`, error);
    throw new Error(`Could not reach YouTube API: ${error}`);
  }

  const data = (await res.json()) as YouTubeApiResponse;
  console.log(`[YouTubeService] API response data:`, JSON.stringify(data, null, 2));

  // API returned an error object
  if (data.error) {
    console.error(`[YouTubeService] API error:`, data.error);
    if (data.error.code === 400) {
      throw new Error("Invalid YouTube API key. Check YOUTUBE_API_KEY in your .env file.");
    }
    if (data.error.code === 403) {
      throw new Error(
        "YouTube API quota exceeded or key restricted. " +
        "Check console.cloud.google.com for quota usage."
      );
    }
    throw new Error(`YouTube API error: ${data.error.message}`);
  }

  if (!data.items || data.items.length === 0) {
    throw new Error(
      "Video not found. It may be private, deleted, or the URL is incorrect."
    );
  }

  const item    = data.items[0];
  const snippet = item.snippet;

  return {
    videoId,
    title:        snippet.title,
    thumbnail:
      snippet.thumbnails.high?.url ??
      snippet.thumbnails.medium?.url ??
      snippet.thumbnails.default?.url ?? "",
    channelTitle: snippet.channelTitle,
    duration:     formatDuration(item.contentDetails.duration),
    viewCount:    item.statistics.viewCount ?? "0",
    url:          `https://www.youtube.com/watch?v=${videoId}`,
  };
}

function extractVideoId(url: string): string | null {
  if (!url) return null;

  const trimmed = url.trim();

  // Handle already-extracted IDs (11 chars, alphanumeric + - _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const u = new URL(trimmed);

    // youtu.be/VIDEO_ID
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("?")[0] || null;
    }

    // youtube.com/watch?v=VIDEO_ID
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;

      // youtube.com/embed/VIDEO_ID
      if (u.pathname.includes("/embed/")) {
        return u.pathname.split("/embed/")[1].split("?")[0] || null;
      }

      // youtube.com/shorts/VIDEO_ID
      if (u.pathname.includes("/shorts/")) {
        return u.pathname.split("/shorts/")[1].split("?")[0] || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function formatDuration(iso: string): string {
  // Convert ISO 8601 (PT14M33S) to human-readable (14 min)
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hours   = parseInt(match[1] ?? "0");
  const minutes = parseInt(match[2] ?? "0");
  const seconds = parseInt(match[3] ?? "0");

  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes} min`;
  return `${seconds}s`;
}