import { Router } from 'express';
import OpenAI from 'openai';
import multer from 'multer';
import { createReadStream } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';

const router = Router();
const MOCK_MODE = process.env.MOCK_MODE === 'true';

const groq = MOCK_MODE ? null : new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
  timeout: 30000,
});

const upload = multer({
  storage: multer.memoryStorage(),
  // Vercel's hard request-body limit is 4.5 MB — keep multer under that so the
  // app's 413 JSON error fires instead of Vercel's opaque infrastructure rejection.
  limits: { fileSize: 4 * 1024 * 1024 }, // 4 MB
  fileFilter: (_, file, cb) => {
    const allowed = ['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'video/webm'];
    cb(null, allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/'));
  },
});

router.post('/', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file received' });

  // In mock mode there's no API key — return the placeholder text so voice still works in dev
  if (MOCK_MODE) {
    return res.json({ text: '[Mock transcription — run with MOCK_MODE=false for real Whisper]' });
  }

  const ext = req.file.mimetype.includes('mp4') ? 'mp4'
    : req.file.mimetype.includes('wav') ? 'wav'
    : req.file.mimetype.includes('mpeg') || req.file.mimetype.includes('mp3') ? 'mp3'
    : req.file.mimetype.includes('ogg') ? 'ogg'
    : 'webm';
  const tmpPath = join(tmpdir(), `audio_${randomBytes(8).toString('hex')}.${ext}`);
  const fileSizeKB = Math.round(req.file.size / 1024);
  console.log(`[TRANSCRIBE] ${fileSizeKB}KB ${ext} received`);
  const t0 = Date.now();

  try {
    await writeFile(tmpPath, req.file.buffer);

    const transcription = await groq.audio.transcriptions.create({
      file: createReadStream(tmpPath),
      model: 'whisper-large-v3-turbo',
      // Prompt biases detection toward English/Hindi and away from misdetection
      // (e.g. Icelandic) that Whisper falls into on short or accented clips
      prompt: 'Loop Health employee speaking in English or Hindi about their work.',
    });

    const preview = transcription.text?.slice(0, 60).replace(/\n/g, ' ') ?? '';
    console.log(`[TRANSCRIBE] done — ${Date.now() - t0}ms — "${preview}${transcription.text?.length > 60 ? '…' : ''}"`);
    res.json({ text: transcription.text });
  } catch (err) {
    console.error('[TRANSCRIBE] error:', err.message);
    res.status(500).json({ error: 'Transcription failed. Please try again.' });
  } finally {
    try { await unlink(tmpPath); } catch { /* ignore */ }
  }
});

export default router;
