/**
 * Pure functional helpers for building Gemini Live client messages.
 * Server messages are parsed in gemini_parser.ts.
 */

import { ALL_CALL_ACTIONS } from "../call_actions";

export function buildLiveEndpoint(host: string, apiVersion: string, apiKey: string): string {
  const service = `google.ai.generativelanguage.${apiVersion}.GenerativeService.BidiGenerateContent`;
  return `wss://${host}/ws/${service}?key=${encodeURIComponent(apiKey)}`;
}

export function buildSetupPayload(
  model: string,
  voice: string,
  thinkingLevel: string,
  systemInstruction?: string
): string {
  const payload: Record<string, any> = {
    setup: {
      model: `models/${model}`,
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
        },
        thinkingConfig: { thinkingLevel },
      },
      // Text transcript of what the AI speaks (audio-only replies carry no text parts)
      outputAudioTranscription: {},
      tools: [
        {
          functionDeclarations: ALL_CALL_ACTIONS.map(({ name, description }) => ({ name, description })),
        },
      ],
    },
  };
  if (systemInstruction) {
    payload.setup.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
  return JSON.stringify(payload);
}

export function buildAudioInputPayload(pcmChunk: Buffer, rate: number): string {
  return JSON.stringify({
    realtimeInput: {
      audio: { mimeType: `audio/pcm;rate=${rate}`, data: pcmChunk.toString("base64") },
    },
  });
}

export function buildClientTextPayload(text: string): string {
  return JSON.stringify({
    clientContent: {
      turns: [{ role: "user", parts: [{ text }] }],
      turnComplete: true,
    },
  });
}
