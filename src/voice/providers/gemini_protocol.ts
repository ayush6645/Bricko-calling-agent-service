/**
 * Pure functional helpers for building and parsing Gemini Live messages.
 */

export interface ParsedGeminiMessage {
  isSetupComplete: boolean;
  audioChunks: Buffer[];
  textParts: string[];
  isHangupTriggered: boolean;
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
      mediaChunks: [{ mimeType: `audio/pcm;rate=${rate}`, data: pcmChunk.toString("base64") }],
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

export function parseServerMessage(rawJson: string, hangupToken?: string): ParsedGeminiMessage {
  const result: ParsedGeminiMessage = {
    isSetupComplete: false,
    audioChunks: [],
    textParts: [],
    isHangupTriggered: false,
  };
  const response = JSON.parse(rawJson);

  if (response.setupComplete) result.isSetupComplete = true;

  const parts = response.serverContent?.modelTurn?.parts;
  if (Array.isArray(parts)) {
    for (const p of parts) {
      if (p.inlineData?.data) result.audioChunks.push(Buffer.from(p.inlineData.data, "base64"));
      if (p.text) {
        result.textParts.push(p.text);
        if (hangupToken && p.text.includes(hangupToken)) result.isHangupTriggered = true;
      }
    }
  }
  return result;
}
