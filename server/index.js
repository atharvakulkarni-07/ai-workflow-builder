const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/tts', async (req, res) => {
  try {
    const response = await fetch('https://api.play.ht/api/v2/tts', {
      method: 'POST',
      headers: {
        AUTHORIZATION: process.env.PLAYHT_KEY,
        'X-USER-ID': process.env.PLAYHT_USERID,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    console.log('PLayHT Response:', data);
    res.json(data);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// additional route for testing
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route is working!' });
});

// another route for testing;
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from the proxy server!' });
})

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}, website: http://localhost:${PORT}`));
