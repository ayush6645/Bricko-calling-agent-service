/**
 * Gemini Live WebSocket Client implementing IVoiceProvider.
 */

import { EventEmitter } from "events";
import WebSocket from "ws";
import { settings } from "../../infrastructure/config/settings";
import { IVoiceProvider, VoiceProviderOptions } from "./base";
import {
  buildLiveEndpoint,
  buildSetupPayload,
  buildAudioInputPayload,
  buildClientTextPayload,
} from "./gemini_protocol";
import { parseServerMessage, ParsedGeminiMessage } from "./gemini_parser";

export class GeminiLiveProvider extends EventEmitter implements IVoiceProvider {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private opts: Required<VoiceProviderOptions>;

  constructor(options: VoiceProviderOptions = {}) {
    super();
    this.opts = {
      apiKey: options.apiKey || settings.gemini.apiKey,
      model: options.model || settings.gemini.model,
      voice: options.voice || settings.gemini.voice,
      thinkingLevel: options.thinkingLevel || settings.gemini.thinkingLevel,
      inputSampleRate: options.inputSampleRate || settings.telephony.sampleRate,
      systemInstruction: options.systemInstruction || "",
    };
  }

  public async connect(): Promise<void> {
    const { host, apiVersion } = settings.gemini;
    const url = buildLiveEndpoint(host, apiVersion, this.opts.apiKey);

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.on("open", () => {
        const payload = buildSetupPayload(this.opts.model, this.opts.voice, this.opts.thinkingLevel, this.opts.systemInstruction);
        this.ws?.send(payload);
      });
      this.ws.on("message", (raw: WebSocket.RawData) => {
        if (this.handleMessage(raw.toString())) { this.isConnected = true; resolve(); }
      });
      this.ws.on("error", (err) => { this.emit("error", err); if (!this.isConnected) reject(err); });
      this.ws.on("close", (code, reason) => { this.isConnected = false; this.emit("close", { code, reason: reason.toString() }); });
    });
  }

  /** Dispatches one server message as provider events; returns true on setup completion. */
  private handleMessage(rawJson: string): boolean {
    let parsed: ParsedGeminiMessage;
    try {
      parsed = parseServerMessage(rawJson);
    } catch (err) {
      this.emit("error", new Error(`Unparseable Gemini message: ${(err as Error).message}`));
      return false;
    }
    parsed.audioChunks.forEach((buf) => this.emit("audio", buf));
    if (parsed.transcript) this.emit("text", parsed.transcript);
    if (parsed.isInterrupted) this.emit("interrupted");
    if (parsed.isTurnComplete) this.emit("turnComplete");
    // end_call gets no toolResponse: the call is torn down once the farewell has played
    if (parsed.isEndCallRequested) this.emit("hangup");
    return parsed.isSetupComplete;
  }

  public sendAudio(pcmChunk: Buffer): void {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(buildAudioInputPayload(pcmChunk, this.opts.inputSampleRate));
    }
  }

  public sendText(text: string): void {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(buildClientTextPayload(text));
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN) this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
  }
}
