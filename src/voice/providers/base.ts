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
  /** The AI finished its spoken turn (no more audio until the caller speaks). */
  on(event: "turnComplete", listener: () => void): this;
  /** The caller started speaking over the AI; any queued AI audio is stale. */
  on(event: "interrupted", listener: () => void): this;
  /** The AI asked to end the call after its farewell. */
  on(event: "hangup", listener: () => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  on(event: "close", listener: (details: { code: number; reason: string }) => void): this;
}
