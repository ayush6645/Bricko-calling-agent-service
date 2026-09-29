/**
 * Base contracts for Real-Time Voice AI Providers.
 */

export interface VoiceProviderOptions {
  apiKey?: string;
  model?: string;
  voice?: string;
  thinkingLevel?: "LOW" | "HIGH";
  inputSampleRate?: number;
  systemInstruction?: string;
}

export interface IVoiceProvider {
  connect(): Promise<void>;
  sendAudio(pcmChunk: Buffer): void;
  sendText(text: string): void;
  disconnect(): void;

  on(event: "audio", listener: (pcmChunk: Buffer) => void): this;
  on(event: "text", listener: (text: string) => void): this;
  on(event: "hangup", listener: () => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  on(event: "close", listener: (details: { code: number; reason: string }) => void): this;
}
