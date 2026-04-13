"use strict";
// server/src/services/youtubeService.ts
// Fixed version with better error handling and URL format support.
// Supports: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchYouTubeMetadata = fetchYouTubeMetadata;
function fetchYouTubeMetadata(url) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g;
        const videoId = extractVideoId(url);
        if (!videoId) {
            throw new Error("Invalid YouTube URL. Use format: youtube.com/watch?v=VIDEO_ID or youtu.be/VIDEO_ID");
        }
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
            throw new Error("YOUTUBE_API_KEY is not set in environment variables");
        }
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos` +
            `?part=snippet,contentDetails,statistics` +
            `&id=${videoId}` +
            `&key=${apiKey}`;
        console.log(`[YouTubeService] Full API URL: ${apiUrl}`);
        let res;
        try {
            console.log(`[YouTubeService] Making fetch request...`);
            res = yield fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'StudyFlow-API/1.0'
                }
            });
            console.log(`[YouTubeService] Fetch completed with status: ${res.status}`);
        }
        catch (error) {
            console.error(`[YouTubeService] Fetch failed with error:`, error);
            throw new Error(`Could not reach YouTube API: ${error}`);
        }
        const data = (yield res.json());
        console.log(`[YouTubeService] API response data:`, JSON.stringify(data, null, 2));
        // API returned an error object
        if (data.error) {
            console.error(`[YouTubeService] API error:`, data.error);
            if (data.error.code === 400) {
                throw new Error("Invalid YouTube API key. Check YOUTUBE_API_KEY in your .env file.");
            }
            if (data.error.code === 403) {
                throw new Error("YouTube API quota exceeded or key restricted. " +
                    "Check console.cloud.google.com for quota usage.");
            }
            throw new Error(`YouTube API error: ${data.error.message}`);
        }
        if (!data.items || data.items.length === 0) {
            throw new Error("Video not found. It may be private, deleted, or the URL is incorrect.");
        }
        const item = data.items[0];
        const snippet = item.snippet;
        return {
            videoId,
            title: snippet.title,
            thumbnail: (_f = (_d = (_b = (_a = snippet.thumbnails.high) === null || _a === void 0 ? void 0 : _a.url) !== null && _b !== void 0 ? _b : (_c = snippet.thumbnails.medium) === null || _c === void 0 ? void 0 : _c.url) !== null && _d !== void 0 ? _d : (_e = snippet.thumbnails.default) === null || _e === void 0 ? void 0 : _e.url) !== null && _f !== void 0 ? _f : "",
            channelTitle: snippet.channelTitle,
            duration: formatDuration(item.contentDetails.duration),
            viewCount: (_g = item.statistics.viewCount) !== null && _g !== void 0 ? _g : "0",
            url: `https://www.youtube.com/watch?v=${videoId}`,
        };
    });
}
function extractVideoId(url) {
    if (!url)
        return null;
    const trimmed = url.trim();
    // Handle already-extracted IDs (11 chars, alphanumeric + - _)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed))
        return trimmed;
    try {
        const u = new URL(trimmed);
        // youtu.be/VIDEO_ID
        if (u.hostname === "youtu.be") {
            return u.pathname.slice(1).split("?")[0] || null;
        }
        // youtube.com/watch?v=VIDEO_ID
        if (u.hostname.includes("youtube.com")) {
            const v = u.searchParams.get("v");
            if (v)
                return v;
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
    }
    catch (_a) {
        return null;
    }
}
function formatDuration(iso) {
    var _a, _b, _c;
    // Convert ISO 8601 (PT14M33S) to human-readable (14 min)
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match)
        return "";
    const hours = parseInt((_a = match[1]) !== null && _a !== void 0 ? _a : "0");
    const minutes = parseInt((_b = match[2]) !== null && _b !== void 0 ? _b : "0");
    const seconds = parseInt((_c = match[3]) !== null && _c !== void 0 ? _c : "0");
    if (hours > 0)
        return `${hours}h ${minutes}min`;
    if (minutes > 0)
        return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes} min`;
    return `${seconds}s`;
}
