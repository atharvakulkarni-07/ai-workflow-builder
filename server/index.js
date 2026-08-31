const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ─── Security Middleware ────────────────────────────────────────────

// Restrict CORS to known origins (add your production URL here)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.) in dev
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
}));

// Body size limit to prevent abuse
app.use(express.json({ limit: '10kb' }));

// ─── Routes ─────────────────────────────────────────────────────────

app.post('/api/tts', async (req, res) => {
  try {
    if (!req.body.text || typeof req.body.text !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "text" field.' });
    }

    const response = await fetch('https://api.play.ht/api/v2/tts', {
      method: 'POST',
      headers: {
        AUTHORIZATION: process.env.PLAYHT_KEY,
        'X-USER-ID': process.env.PLAYHT_USERID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PlayHT API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `PlayHT API returned ${response.status}`,
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('TTS proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/test', (_req, res) => {
  res.json({ message: 'Test route is working!' });
});

app.get('/api/hello', (_req, res) => {
  res.json({ message: 'Hello from the proxy server!' });
});

// ─── Start Server ───────────────────────────────────────────────────

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Proxy server running on port ${PORT}, website: http://localhost:${PORT}`));
