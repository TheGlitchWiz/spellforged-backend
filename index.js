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

app.use(cors({
  origin: "https://www.spellforgedmatrixsponge.com"
}));

app.use('/videos', express.static(path.join(__dirname, 'videos')));

const upload = multer({ dest: 'uploads/' });

app.post('/api/generate', upload.array('images'), async (req, res) => {
  const id = Date.now().toString();
  const tempDir = path.join(__dirname, 'uploads', id);
  const outputDir = path.join(__dirname, 'videos');
  fs.mkdirSync(tempDir, { recursive: true });

  const renamed = {};
  const order = ['man.jpg', 'apple.jpg'];

  try {
    await Promise.all(req.files.map(async (file, i) => {
      const newName = order[i] || file.originalname.toLowerCase();
      const newPath = path.join(tempDir, newName);
      await sharp(file.path).resize(640, 640).jpeg().toFile(newPath);
      fs.unlinkSync(file.path);
      renamed[newName] = true;
    }));

    const spongePath = path.join(__dirname, 'images', 'sponge.jpg');
    await sharp(spongePath)
      .resize(640, 640)
      .jpeg()
      .toFile(path.join(tempDir, 'sponge.jpg'));

    const sparkle = path.join(__dirname, 'overlays', 'sparkle.gif');
    const output = path.join(outputDir, `${id}.mp4`);

    const cmd = `ffmpeg -y \
-loop 1 -t 2 -i "${tempDir}/sponge.jpg" \
-loop 1 -t 2 -i "${tempDir}/man.jpg" \
-loop 1 -t 2 -i "${tempDir}/apple.jpg" \
-ignore_loop 0 -i "${sparkle}" \
-filter_complex "\
[0:v]scale=640:640[img0];[1:v]scale=640:640[img1];[2:v]scale=640:640[img2];[3:v]scale=640:640[sparkle];\
[img0][sparkle]overlay=shortest=1[o0];\
[o0][img1]xfade=transition=fade:duration=1:offset=2[o1];\
[o1][img2]xfade=transition=fade:duration=1:offset=4" \
-pix_fmt yuv420p -movflags +faststart -c:v libx264 "${output}"`;

    exec(cmd, (err) => {
      if (err) return res.status(500).json({ error: "FFmpeg failed" });
      res.json({ videoUrl: `/videos/${id}.mp4` });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Image processing failed." });
  }
});

app.listen(port, () => console.log(`🧙 Backend running on port ${port}`));
