"use strict";
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
        var _a, _b, _c, _d, _e;
        const videoId = extractVideoId(url);
        if (!videoId)
            throw new Error("Invalid YouTube URL");
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey)
            throw new Error("YOUTUBE_API_KEY is not configured");
        const apiUrl = `https://www.googleapis.com/youtube/v3/videos` +
            `?part=snippet,contentDetails,statistics` +
            `&id=${videoId}&key=${apiKey}`;
        const res = yield fetch(apiUrl);
        const data = (yield res.json());
        if (!data.items || data.items.length === 0) {
            throw new Error("Video not found or is private");
        }
        const item = data.items[0];
        const snippet = item.snippet;
        return {
            videoId,
            title: snippet.title,
            thumbnail: (_d = (_b = (_a = snippet.thumbnails.high) === null || _a === void 0 ? void 0 : _a.url) !== null && _b !== void 0 ? _b : (_c = snippet.thumbnails.default) === null || _c === void 0 ? void 0 : _c.url) !== null && _d !== void 0 ? _d : "",
            channelTitle: snippet.channelTitle,
            duration: formatDuration(item.contentDetails.duration),
            viewCount: (_e = item.statistics.viewCount) !== null && _e !== void 0 ? _e : "0",
            url: `https://www.youtube.com/watch?v=${videoId}`,
        };
    });
}
function extractVideoId(url) {
    try {
        const u = new URL(url);
        if (u.hostname === "youtu.be")
            return u.pathname.slice(1);
        if (u.hostname.includes("youtube.com"))
            return u.searchParams.get("v");
        return null;
    }
    catch (_a) {
        return null;
    }
}
function formatDuration(isoDuration) {
    var _a, _b;
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match)
        return "";
    const hours = parseInt((_a = match[1]) !== null && _a !== void 0 ? _a : "0");
    const minutes = parseInt((_b = match[2]) !== null && _b !== void 0 ? _b : "0");
    if (hours > 0)
        return `${hours}h ${minutes}min`;
    return `${minutes} min`;
}
