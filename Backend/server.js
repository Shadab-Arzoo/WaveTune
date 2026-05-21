import express from "express";
import cors from "cors";
import trendingRoute from "./routes/trending.js";
import streamRoute from "./routes/stream.js";
import searchRoute from "./routes/search.js";

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/trending", trendingRoute);
app.use("/api/stream", streamRoute);
app.use("/api/search", searchRoute);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🎵 WaveTune Backend running at http://localhost:${PORT}`);
});