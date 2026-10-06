/**
 * Post-call transcript processing with the text model (GEMINI_TEXT_MODEL), in one
 * request per call: for every turn, the spoken language, the same words in Latin
 * letters (transliteration, readable aloud as spoken) and an English translation.
 * The reply is validated turn by turn; anything inconsistent fails the whole step.
 */

import { settings } from "../infrastructure/config/settings";
import { generateJson } from "../voice/providers/gemini_text_client";
import { TranscriptTurn } from "./call_transcript";

export const UNKNOWN_LANGUAGE = "other";

export interface TurnEnrichment {
  seq: number;
  language: string;
  text_roman: string;
  text_english: string;
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    turns: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          seq: { type: "INTEGER" },
          language: { type: "STRING" },
          text_roman: { type: "STRING" },
          text_english: { type: "STRING" },
        },
        required: ["seq", "language", "text_roman", "text_english"],
      },
    },
  },
  required: ["turns"],
};

function instruction(codes: string[]): string {
  return `You process the transcript of a phone call between a caller ("lead") and an AI property advisor ("bricko"). For EVERY turn, in the same order, return:
- seq: the turn's seq number, unchanged.
- language: the language the turn was spoken in, one of: ${codes.join(", ")}. Judge from words and grammar, not the script: romanised Marathi is Marathi; Hindi with English property words (BHK, budget, possession) is Hindi. Use "${UNKNOWN_LANGUAGE}" if none fits.
- text_roman: the same words written in Latin letters exactly as pronounced. This is a transliteration, NOT a translation; keep English words as they are. If the text is already in Latin letters, return it unchanged.
- text_english: a faithful, natural English translation. If the turn is already English, return it unchanged.
Never add, drop, merge or reorder turns.`;
}

export async function enrichTranscript(turns: TranscriptTurn[]): Promise<TurnEnrichment[]> {
  if (turns.length === 0) return [];
  const { language, transcript } = settings;
  const codes = [...language.supported, UNKNOWN_LANGUAGE];

  const reply: any = await generateJson({
    systemInstruction: instruction(codes),
    userContent: JSON.stringify(turns.map(({ seq, speaker, text }) => ({ seq, speaker, text }))),
    responseSchema: RESPONSE_SCHEMA,
    timeoutMs: transcript.enrichmentTimeoutMs,
    retries: transcript.enrichmentAttempts - 1,
  });

  const result: TurnEnrichment[] = Array.isArray(reply?.turns) ? reply.turns : [];
  const inOrder = result.length === turns.length && result.every((t, i) => t.seq === turns[i].seq);
  if (!inOrder) throw new Error(`expected ${turns.length} turns in order, got ${result.length}`);
  return result.map((t) => ({ ...t, language: codes.includes(t.language) ? t.language : UNKNOWN_LANGUAGE }));
}
