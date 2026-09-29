import dotenv from "dotenv";

dotenv.config();

function env(key: string, fallback?: string): string {
  const value = process.env[key] || fallback;
  if (!value) {
    throw new Error(`[Settings] Missing required environment variable: ${key}`);
  }
  return value;
}

export const settings = {
  gemini: {
    apiKey: env("GEMINI_API_KEY"),
    model: env("GEMINI_MODEL", "gemini-3.8-live-extended-thinking"),
    voice: env("GEMINI_VOICE", "Charon"),
    thinkingLevel: env("GEMINI_THINKING_LEVEL", "LOW") as "LOW" | "HIGH",
    host: "generativelanguage.googleapis.com",
  },
  telephony: {
    port: parseInt(process.env.PORT || "8000", 10),
    host: process.env.HOST || "0.0.0.0",
    inputSampleRate: 16000,
    outputSampleRate: 24000,
  },
} as const;

export type Settings = typeof settings;
