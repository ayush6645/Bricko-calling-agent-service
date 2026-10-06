/**
 * Serialised view of a call transcript: live turns merged with post-call
 * enrichment, plus a language summary derived from the enriched turns.
 */

import { SPEAKERS, TranscriptTurn } from "./call_transcript";
import { TurnEnrichment } from "./transcript_enrichment";

export interface LanguageSwitch {
  /** seq of the first AI turn spoken in the new language */
  at_seq: number;
  from: string;
  to: string;
}

export interface LanguageSummary {
  /** Language of the AI's first turn (the greeting) */
  opening: string | null;
  /** Language of the AI's last turn */
  closing: string | null;
  /** Every language spoken by either side, in order of first use */
  used: string[];
  /** Changes in the language the AI spoke */
  switches: LanguageSwitch[];
}

/** Live turns with their enrichment fields; enrichment fields are null when unavailable. */
export function mergeTranscript(turns: TranscriptTurn[], enrichment: TurnEnrichment[] | null) {
  return turns.map((turn, i) => ({
    seq: turn.seq,
    speaker: turn.speaker,
    language: enrichment?.[i]?.language ?? null,
    text: turn.text,
    text_roman: enrichment?.[i]?.text_roman ?? null,
    text_english: enrichment?.[i]?.text_english ?? null,
    interrupted: turn.interrupted,
  }));
}

export function summarizeLanguages(turns: TranscriptTurn[], enrichment: TurnEnrichment[]): LanguageSummary {
  const used = [...new Set(enrichment.map((e) => e.language))];
  const aiTurns = enrichment.filter((_, i) => turns[i].speaker === SPEAKERS.ai);
  const switches: LanguageSwitch[] = [];
  aiTurns.forEach((turn, i) => {
    const previous = aiTurns[i - 1];
    if (previous && previous.language !== turn.language) {
      switches.push({ at_seq: turn.seq, from: previous.language, to: turn.language });
    }
  });
  return {
    opening: aiTurns[0]?.language ?? null,
    closing: aiTurns[aiTurns.length - 1]?.language ?? null,
    used,
    switches,
  };
}
