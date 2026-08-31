// src/hooks/useSpeechInput.js
// Encapsulates Web Speech API voice-to-text logic.
// Extracted from inline onClick handler in Playground.jsx.

import { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Custom hook for voice-to-text input via Web Speech API.
 * @param {Function} onResult - Callback called with the transcript string
 * @returns {{ listening: boolean, startListening: Function }}
 */
export default function useSpeechInput(onResult) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      toast.error('Speech recognition failed. Please try again.');
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognition.start();
    setListening(true);
    recognitionRef.current = recognition;
  }, [onResult]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
    }
  }, []);

  return { listening, startListening, stopListening };
}
