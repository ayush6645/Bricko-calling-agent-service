/**
 * Identifies the spoken language of one utterance and translates it to English,
 * using the configured text model (GEMINI_TEXT_MODEL). Romanised text counts as the
 * language spoken, so "tumcha budget kiti aahe" is Marathi although written in Latin
 * letters. Network failures are retried LANGUAGE_CHECK_JUDGE_RETRIES times.
 */

import { settings } from "../../src/infrastructure/config/settings";
import { generateJson } from "../../src/voice/providers/gemini_text_client";

const OTHER = "other";
const RETRIES = Number(process.env.LANGUAGE_CHECK_JUDGE_RETRIES) || 2;
const TIMEOUT_MS = Number(process.env.LANGUAGE_CHECK_JUDGE_TIMEOUT_MS) || 20000;

export interface Judgement {
  language: string;
  english: string;
}

const SCHEMA = {
  type: "OBJECT",
  properties: { language: { type: "STRING" }, english: { type: "STRING" } },
  required: ["language", "english"],
};

export async function judge(utterance: string): Promise<Judgement> {
  const codes = [...settings.language.supported, OTHER];
  const reply: any = await generateJson({
    systemInstruction:
      "You receive one phone-call utterance. It may be written in native script or in Latin letters " +
      "(romanised); judge the spoken language, not the script. English property words (BHK, budget, " +
      `possession) inside another language do not make it English. Return "language" (one of ` +
      `${codes.join(", ")}) and "english" (the utterance translated into English).`,
    userContent: utterance,
    responseSchema: SCHEMA,
    timeoutMs: TIMEOUT_MS,
    retries: RETRIES,
  });
  return { language: codes.includes(reply?.language) ? reply.language : OTHER, english: String(reply?.english ?? "") };
}
