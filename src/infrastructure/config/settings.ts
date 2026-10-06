import dotenv from "dotenv";
import { loadLanguageSettings } from "./language_settings";

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
    // Gemini Live reply audio: 16-bit mono PCM at this rate (24 kHz as documented and observed)
    outputSampleRate: envInt("GEMINI_OUTPUT_SAMPLE_RATE", 24000),
    // Text model for non-live work (language identification in checks, transcript processing)
    textModel: env("GEMINI_TEXT_MODEL", "gemini-3.8-flash"),
    textApiVersion: env("GEMINI_TEXT_API_VERSION", "v1beta"),
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
  // Post-call transcript processing: per-turn language, Roman-letter text, English translation
  transcript: {
    enrichment: env("TRANSCRIPT_ENRICHMENT", "true") === "true",
    enrichmentTimeoutMs: envInt("TRANSCRIPT_ENRICHMENT_TIMEOUT_MS", 30000),
    enrichmentAttempts: envInt("TRANSCRIPT_ENRICHMENT_ATTEMPTS", 3),
  },
  // Local-only HTTP endpoint the Asterisk gateway posts caller details to before AudioSocket
  metadata: {
    host: env("METADATA_HOST", "127.0.0.1"),
    port: envInt("METADATA_PORT", 8001),
    path: env("METADATA_PATH", "/calls"),
    maxBodyBytes: envInt("METADATA_MAX_BODY_BYTES", 8192),
    // Unclaimed caller details are dropped after this long (e.g. AudioSocket never connected)
    ttlMs: envInt("METADATA_TTL_MS", 60000),
  },
  logging: {
    // IANA zone for human-readable log timestamps; stored records always use UTC ISO-8601
    timeZone: env("LOG_TIMEZONE", "UTC"),
  },
  language: loadLanguageSettings(process.env),
} as const;

export type Settings = typeof settings;
