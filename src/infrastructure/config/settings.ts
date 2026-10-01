import dotenv from "dotenv";

dotenv.config();

function env(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (!value) {
    throw new Error(`[Settings] Missing required environment variable: ${key}`);
  }
  return value;
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  const value = raw ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`[Settings] ${key} must be a positive integer, got "${raw}"`);
  }
  return value;
}

export const settings = {
  gemini: {
    apiKey: env("GEMINI_API_KEY"),
    model: env("GEMINI_MODEL", "gemini-3.8-live-extended-thinking"),
    voice: env("GEMINI_VOICE", "Charon"),
    thinkingLevel: env("GEMINI_THINKING_LEVEL", "LOW") as "LOW" | "HIGH",
    host: env("GEMINI_HOST", "generativelanguage.googleapis.com"),
    apiVersion: env("GEMINI_API_VERSION", "v1alpha"),
    // Gemini Live always replies with 16-bit mono PCM at this rate
    outputSampleRate: envInt("GEMINI_OUTPUT_SAMPLE_RATE", 24000),
  },
  telephony: {
    port: envInt("PORT", 8000),
    host: env("HOST", "0.0.0.0"),
    // Asterisk AudioSocket streams 16-bit mono signed-linear PCM at 8 kHz
    sampleRate: envInt("TELEPHONY_SAMPLE_RATE", 8000),
    frameDurationMs: envInt("TELEPHONY_FRAME_MS", 20),
  },
  call: {
    hangupGraceMs: envInt("CALL_HANGUP_GRACE_MS", 1500),
    logTranscripts: env("CALL_LOG_TRANSCRIPTS", "false") === "true",
  },
} as const;

export type Settings = typeof settings;
