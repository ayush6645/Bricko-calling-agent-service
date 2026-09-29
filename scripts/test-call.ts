/**
 * Local Call Simulator for Testing Bricko Voice Engine.
 * Connects to the AudioSocket TCP server and tests the voice loop end-to-end.
 */

import net from "net";
import dotenv from "dotenv";
import {
  parseAudioFrame,
  buildAudioSocketFrame,
  AudioSocketMessageType,
} from "../src/api/audiosocket_protocol";

dotenv.config();

const PORT = parseInt(process.env.PORT || "8000", 10);
const HOST = process.env.HOST || "127.0.0.1";

console.log(`[Simulator] Connecting to Bricko Voice Engine on ${HOST}:${PORT}...`);

const client = net.createConnection({ port: PORT, host: HOST }, () => {
  console.log("[Simulator] Call connected successfully! Waiting for Bricko's voice...");
});

let totalAudioBytesReceived = 0;
let buffer: Buffer<any> = Buffer.alloc(0);

client.on("data", (chunk: Buffer) => {
  buffer = Buffer.concat([buffer, chunk]);
  let frame = parseAudioFrame(buffer);
  while (frame) {
    buffer = frame.remainingBuffer;
    if (frame.type === AudioSocketMessageType.AUDIO) {
      totalAudioBytesReceived += frame.payload.length;
      process.stdout.write(`\r[Simulator] Receiving Bricko Audio... Total: ${totalAudioBytesReceived} bytes`);
    } else if (frame.type === AudioSocketMessageType.HANGUP) {
      console.log("\n[Simulator] Hangup frame received from server.");
    }
    frame = parseAudioFrame(buffer);
  }
});

client.on("close", () => {
  console.log(`\n[Simulator] Call closed. Total audio received: ${totalAudioBytesReceived} bytes.`);
  process.exit(0);
});

client.on("error", (err: Error) => {
  console.error("\n[Simulator] Connection error:", err.message);
  process.exit(1);
});

// Automatically hang up after 8 seconds of receiving speech
setTimeout(() => {
  console.log("\n[Simulator] Test completed. Sending hangup frame...");
  client.write(buildAudioSocketFrame(AudioSocketMessageType.HANGUP), () => {
    client.end();
  });
}, 8000);
