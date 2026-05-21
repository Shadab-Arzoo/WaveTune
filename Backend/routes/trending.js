import express from "express";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const router = express.Router();

// Curated trending/popular songs - fetched from YouTube search
// We search for "trending songs 2025" and parse the results
router.get("/", async (req, res) => {
  try {
    // Search YouTube for trending music and get structured data
    const { stdout } = await execAsync(
      `yt-dlp "ytsearch20:trending music songs 2025" --flat-playlist --dump-json --no-warnings 2>/dev/null`,
      { maxBuffer: 1024 * 1024 * 10, timeout: 30000 }
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
      } catch (parseErr) {
        // Skip malformed lines
      }
    }

    res.json({ songs });
  } catch (error) {
    console.error("Trending fetch error:", error.message);

    // Fallback: use a curated list of popular song searches
    try {
      const fallbackQueries = [
        "Die With A Smile Lady Gaga Bruno Mars",
        "APT. ROSÉ Bruno Mars",
        "Espresso Sabrina Carpenter",
        "Birds Of A Feather Billie Eilish",
        "Beautiful Things Benson Boone",
        "Taste Sabrina Carpenter",
        "Lose Control Teddy Swims",
        "Cruel Summer Taylor Swift",
        "We Can't Be Friends Ariana Grande",
        "Greedy Tate McRae",
        "Water Tyla",
        "Flowers Miley Cyrus",
        "Vampire Olivia Rodrigo",
        "Paint The Town Red Doja Cat",
        "Lovin On Me Jack Harlow",
        "Snooze SZA",
        "Fukumean Gunna",
        "Last Night Morgan Wallen",
        "Kill Bill SZA",
        "Anti Hero Taylor Swift",
      ];

      const songs = [];

      for (const query of fallbackQueries) {
        try {
          const { stdout: searchOut } = await execAsync(
            `yt-dlp "ytsearch1:${query} official audio" --flat-playlist --dump-json --no-warnings 2>/dev/null`,
            { maxBuffer: 1024 * 1024, timeout: 15000 }
          );

          const data = JSON.parse(searchOut.trim());
          if (data.id) {
            songs.push({
              id: data.id,
              title: query.split(" ").slice(0, -2).join(" ") || data.title,
              artist: query.split(" ").slice(-2).join(" ") || data.uploader,
              thumbnail:
                data.thumbnails?.[data.thumbnails.length - 1]?.url ||
                `https://img.youtube.com/vi/${data.id}/hqdefault.jpg`,
              duration: data.duration || 0,
              viewCount: data.view_count || 0,
            });
          }
        } catch {
          // Skip failed individual searches
        }
      }

      res.json({ songs });
    } catch (fallbackError) {
      res.status(500).json({ error: "Failed to fetch trending songs" });
    }
  }
});

export default router;
