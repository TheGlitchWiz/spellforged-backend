// backend/index.js
import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 8080;

// Enable CORS for frontend domain
app.use(cors({
  origin: ["https://www.spellforgedmatrixsponge.com", "https://spellforgedmatrixsponge.com"]
}));

// Serve generated videos
app.use('/videos', express.static(path.join(__dirname, 'videos')));

// Set up file upload handler
const upload = multer({ dest: 'uploads/' });

// POST /api/generate - Image-to-video API
app.post("/api/generate", upload.array("images", 2), async (req, res) => {
  if (!req.files || req.files.length < 2) {
    return res.status(400).json({ error: "Two images required." });
  }

  const [img1, img2] = req.files;
  const outputDir = path.join(__dirname, 'videos');
  const outputPath = path.join(outputDir, `video_${Date.now()}.mp4`);

  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // FFmpeg command
  const command = `ffmpeg -y -loop 1 -t 1 -i ${img1.path} -loop 1 -t 1 -i ${img2.path} -filter_complex "[0:v][1:v]concat=n=2:v=1[outv]" -map "[outv]" ${outputPath}`;

  console.log("Running FFmpeg command:", command);

  exec(command, (err, stdout, stderr) => {
    // Cleanup temp uploads regardless of success
    try {
      fs.unlinkSync(img1.path);
      fs.unlinkSync(img2.path);
    } catch (cleanupErr) {
      console.warn("Cleanup error:", cleanupErr.message);
    }

    if (err) {
      console.error("FFmpeg error:", err.message);
      console.error("STDERR:", stderr);
      return res.status(500).json({ error: "Video generation failed. Check server logs." });
    }

    console.log("FFmpeg success, video saved to:", outputPath);
    const videoUrl = `/videos/${path.basename(outputPath)}`;
    res.json({ videoUrl });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
