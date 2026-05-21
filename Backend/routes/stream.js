import express from "express";
import { exec } from "child_process";
import { promisify } from "util";
import axios from "axios";

const execAsync = promisify(exec);
const router = express.Router();

// Cache audio URLs to avoid re-extracting
const audioCache = new Map();
const CACHE_TTL = 3600000; // 1 hour

function isValidVideoId(videoId) {
  return typeof videoId === "string" && videoId.length === 11;
}

async function extractAudioMeta(videoId) {
  const cached = audioCache.get(videoId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Keep extraction order predictable: title, url, duration.
  const { stdout } = await execAsync(
    `yt-dlp -f "bestaudio[ext=m4a]/bestaudio" --get-title --get-url --get-duration "${youtubeUrl}" --no-warnings 2>/dev/null`,
    { maxBuffer: 1024 * 1024, timeout: 30000 }
  );

  const lines = stdout.trim().split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length < 3) {
    throw new Error("Could not extract full stream metadata");
  }

  const [title, audioUrl, duration] = lines;
  if (!audioUrl?.startsWith("http")) {
    throw new Error("No audio URL found");
  }

  const data = {
    videoId,
    title,
    audioUrl,
    duration,
    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  };

  audioCache.set(videoId, { data, timestamp: Date.now() });
  return data;
}

// GET /api/stream/:videoId/audio - Proxy extracted audio stream to clients.
// Also handles HEAD requests for metadata.
router.all("/:videoId/audio", async (req, res) => {
  const { videoId } = req.params;
  const isHeadRequest = req.method === "HEAD";

  if (!isValidVideoId(videoId)) {
    return res.status(400).json({ error: "Invalid video ID" });
  }

  try {
    const { audioUrl } = await extractAudioMeta(videoId);
    const range = req.headers.range;
    
    const upstream = await axios.get(audioUrl, {
      responseType: "stream",
      timeout: 30000,
      headers: range ? { Range: range } : undefined,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    const passthroughHeaders = [
      "content-type",
      "content-length",
      "accept-ranges",
      "content-range",
      "cache-control",
    ];

    for (const headerName of passthroughHeaders) {
      const headerValue = upstream.headers[headerName];
      if (headerValue) {
        res.setHeader(headerName, headerValue);
      }
    }

    res.status(upstream.status);
    
    if (isHeadRequest) {
      res.end();
    } else {
      upstream.data.pipe(res);
    }
  } catch (error) {
    console.error(`Audio proxy error for ${videoId}:`, error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to stream audio. Try again." });
    } else {
      res.end();
    }
  }
});

// GET /api/stream/:videoId - Extract stream metadata for player UI.
router.get("/:videoId", async (req, res) => {
  const { videoId } = req.params;

  if (!isValidVideoId(videoId)) {
    return res.status(400).json({ error: "Invalid video ID" });
  }

  try {
    const streamMeta = await extractAudioMeta(videoId);
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.json({
      videoId: streamMeta.videoId,
      title: streamMeta.title,
      audioUrl: `${baseUrl}/api/stream/${videoId}/audio`,
      duration: streamMeta.duration,
      thumbnail: streamMeta.thumbnail,
    });
  } catch (error) {
    console.error(`Stream metadata error for ${videoId}:`, error.message);
    res.status(500).json({ error: "Failed to extract audio. Try again." });
  }
});

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of audioCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      audioCache.delete(key);
    }
  }
}, 600000); // Every 10 minutes

export default router;
