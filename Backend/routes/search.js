import express from "express";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const router = express.Router();

// GET /api/search?q=query - Search for songs on YouTube
router.get("/", async (req, res) => {
  const query = req.query.q;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: "Search query required" });
  }

  try {
    const sanitizedQuery = query.replace(/['"\\]/g, "");

    const { stdout } = await execAsync(
      `yt-dlp "ytsearch10:${sanitizedQuery} song audio" --flat-playlist --dump-json --no-warnings 2>/dev/null`,
      { maxBuffer: 1024 * 1024 * 5, timeout: 20000 }
    );

    const lines = stdout.trim().split("\n").filter(Boolean);
    const songs = [];

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.id && data.title) {
          songs.push({
            id: data.id,
            title: data.title,
            artist: data.channel || data.uploader || "Unknown Artist",
            thumbnail:
              data.thumbnails?.[data.thumbnails.length - 1]?.url ||
              `https://img.youtube.com/vi/${data.id}/hqdefault.jpg`,
            duration: data.duration || 0,
            viewCount: data.view_count || 0,
          });
        }
      } catch {
        // Skip malformed lines
      }
    }

    res.json({ songs });
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
