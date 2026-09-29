/**
 * Gemini Live WebSocket Client implementing IVoiceProvider.
 */

import { EventEmitter } from "events";
import WebSocket from "ws";
import { settings } from "../../infrastructure/config/settings";
import { IVoiceProvider, VoiceProviderOptions } from "./base";
import {
  buildSetupPayload,
  buildAudioInputPayload,
  buildClientTextPayload,
  parseServerMessage,
} from "./gemini_protocol";

const HANGUP_TOKEN = "[ACTION: HANGUP]";

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
      inputSampleRate: options.inputSampleRate || settings.telephony.inputSampleRate,
      systemInstruction: options.systemInstruction || "",
    };
  }

  public async connect(): Promise<void> {
    const url = `wss://${settings.gemini.host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.opts.apiKey}`;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.on("open", () => {
        const payload = buildSetupPayload(this.opts.model, this.opts.voice, this.opts.thinkingLevel, this.opts.systemInstruction);
        this.ws?.send(payload);
      });
      this.ws.on("message", (raw: WebSocket.RawData) => {
        const parsed = parseServerMessage(raw.toString(), HANGUP_TOKEN);
        if (parsed.isSetupComplete) { this.isConnected = true; resolve(); }
        parsed.audioChunks.forEach((buf) => this.emit("audio", buf));
        parsed.textParts.forEach((t) => this.emit("text", t));
        if (parsed.isHangupTriggered) this.emit("hangup");
      });
      this.ws.on("error", (err) => { this.emit("error", err); if (!this.isConnected) reject(err); });
      this.ws.on("close", (code, reason) => { this.isConnected = false; this.emit("close", { code, reason: reason.toString() }); });
    });
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
