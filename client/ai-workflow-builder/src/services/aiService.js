// src/services/aiService.js
// Centralized API service — all AI model calls go through here.
// Eliminates the 5x copy-pasted fetch blocks from Playground.jsx.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Uses OpenRouter's free model router — automatically selects the best
// available free model for each request. Guarantees $0 cost.
// See: https://openrouter.ai/docs/features/model-routing
const DEFAULT_MODEL = 'openrouter/free';

/**
 * Makes a chat completion request to OpenRouter.
 * @param {object} options
 * @param {string} options.systemPrompt - The system message for the model
 * @param {string} options.userMessage - The user message content
 * @param {number} [options.maxTokens=512] - Max tokens for the response
 * @returns {Promise<string>} The model's response text
 * @throws {Error} On network or API errors
 */
export async function chatCompletion({ systemPrompt, userMessage, maxTokens = 512 }) {
  const apiKey = import.meta.env.VITE_OPENROUTER_KEY;
  if (!apiKey || apiKey === 'your_openrouter_api_key_here') {
    throw new Error('OpenRouter API key is not configured. Please set VITE_OPENROUTER_KEY in your .env file.');
  }

  const resp = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'workflow.ai',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: maxTokens,
    }),
  });

  const data = await resp.json();

  if (!resp.ok) {
    throw new Error(`API Error: ${resp.status} ${resp.statusText}`);
  }
  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  if (!data.choices || !Array.isArray(data.choices) || !data.choices[0]?.message?.content) {
    throw new Error('API returned no choices/content.');
  }

  return data.choices[0].message.content;
}

/**
 * Generates an image URL via Pollinations AI.
 * @param {string} prompt - The image generation prompt
 * @returns {string} The image URL
 */
export function generateImageUrl(prompt) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
}

/**
 * Calls the backend TTS proxy.
 * @param {string} text - Text to convert to speech
 * @param {object} [options] - Optional voice/language config
 * @returns {Promise<object>} Response data with audioUrl
 * @throws {Error} On network or API errors
 */
export async function textToSpeech(text, options = {}) {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';

  const resp = await fetch(`${apiUrl}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'PlayDialog',
      text,
      voice: options.voice || 'en-US-1',
      outputFormat: 'mp3',
      speed: 1,
      sampleRate: 44100,
      language: options.language || 'english',
    }),
  });

  if (!resp.ok) {
    throw new Error(`TTS API Error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  return {
    text: 'Audio generated.',
    audioUrl: data.audioUrl || data.url || '',
  };
}
