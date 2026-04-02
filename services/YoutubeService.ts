// src/services/youtubeService.ts
import type { YouTubeMetadata } from "../types/index";

interface YouTubeApiItem {
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      high?: { url: string };
      default?: { url: string };
    };
  };
  contentDetails: {
    duration: string; // ISO 8601 e.g. "PT14M33S"
  };
  statistics: {
    viewCount?: string;
  };
}

interface YouTubeApiResponse {
  items?: YouTubeApiItem[];
}

export async function fetchYouTubeMetadata(url: string): Promise<YouTubeMetadata> {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube URL");

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY is not configured");

  const apiUrl =
    `https://www.googleapis.com/youtube/v3/videos` +
    `?part=snippet,contentDetails,statistics` +
    `&id=${videoId}&key=${apiKey}`;

  const res  = await fetch(apiUrl);
  const data = (await res.json()) as YouTubeApiResponse;

  if (!data.items || data.items.length === 0) {
    throw new Error("Video not found or is private");
  }

  const item    = data.items[0];
  const snippet = item.snippet;

  return {
    videoId,
    title:        snippet.title,
    thumbnail:    snippet.thumbnails.high?.url ?? snippet.thumbnails.default?.url ?? "",
    channelTitle: snippet.channelTitle,
    duration:     formatDuration(item.contentDetails.duration),
    viewCount:    item.statistics.viewCount ?? "0",
    url:          `https://www.youtube.com/watch?v=${videoId}`,
  };
}

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    return null;
  } catch {
    return null;
  }
}

function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hours   = parseInt(match[1] ?? "0");
  const minutes = parseInt(match[2] ?? "0");
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes} min`;
}