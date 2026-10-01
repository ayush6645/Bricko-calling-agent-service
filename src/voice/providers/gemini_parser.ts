/**
 * Pure parser for Gemini Live server messages.
 */

import { CALL_ACTIONS } from "../call_actions";

export interface ParsedGeminiMessage {
  isSetupComplete: boolean;
  audioChunks: Buffer[];
  /** Fragment of the transcript of what the AI is speaking. */
  transcript: string;
  isTurnComplete: boolean;
  isInterrupted: boolean;
  isEndCallRequested: boolean;
}

interface GeminiPart {
  inlineData?: { data?: string };
}

interface GeminiFunctionCall {
  name?: string;
}

export function parseServerMessage(rawJson: string): ParsedGeminiMessage {
  const response = JSON.parse(rawJson);
  const content = response.serverContent ?? {};
  const parts: GeminiPart[] = content.modelTurn?.parts ?? [];
  const functionCalls: GeminiFunctionCall[] = response.toolCall?.functionCalls ?? [];

  return {
    isSetupComplete: Boolean(response.setupComplete),
    audioChunks: parts
      .filter((part) => part.inlineData?.data)
      .map((part) => Buffer.from(part.inlineData!.data!, "base64")),
    transcript: content.outputTranscription?.text ?? "",
    isTurnComplete: Boolean(content.turnComplete),
    isInterrupted: Boolean(content.interrupted),
    isEndCallRequested: functionCalls.some((call) => call.name === CALL_ACTIONS.END_CALL.name),
  };
}
