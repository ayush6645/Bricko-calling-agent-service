/**
 * Thin Telephony Ingress Adapter for WhatsApp & VoIP AudioSocket connections.
 */

import net from "net";
import { EventEmitter } from "events";
import { settings } from "../infrastructure/config/settings";
import {
  parseAudioFrame,
  buildAudioSocketFrame,
  AudioSocketMessageType,
} from "./audiosocket_protocol";

export class TelephonySession extends EventEmitter {
  private buffer: Buffer<any> = Buffer.alloc(0);
  public readonly id: string;

  constructor(private socket: net.Socket) {
    super();
    this.id = `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.socket.on("data", (chunk) => this.handleData(chunk));
    this.socket.on("close", () => this.emit("close"));
    this.socket.on("error", (err) => this.emit("error", err));
  }

  private handleData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    let frame = parseAudioFrame(this.buffer);
    while (frame) {
      this.buffer = frame.remainingBuffer;
      if (frame.type === AudioSocketMessageType.AUDIO) this.emit("audio", frame.payload);
      if (frame.type === AudioSocketMessageType.HANGUP) { this.emit("hangup"); this.hangup(); }
      frame = parseAudioFrame(this.buffer);
    }
  }

  public sendAudio(pcm: Buffer): void {
    if (!this.socket.destroyed) {
      this.socket.write(buildAudioSocketFrame(AudioSocketMessageType.AUDIO, pcm));
    }
  }

  public hangup(): void {
    if (!this.socket.destroyed) {
      this.socket.write(buildAudioSocketFrame(AudioSocketMessageType.HANGUP), () => this.socket.end());
    }
  }
}

export class TelephonyAdapter extends EventEmitter {
  private server: net.Server | null = null;

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = net.createServer((socket) => {
        this.emit("call", new TelephonySession(socket));
      });
      this.server.listen(settings.telephony.port, settings.telephony.host, () => resolve());
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server ? this.server.close(() => resolve()) : resolve();
    });
  }
}
