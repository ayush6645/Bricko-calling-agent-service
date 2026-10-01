/**
 * Call Orchestrator: Wires the telephony audio stream to the Voice AI provider.
 */

import { logger } from "../../infrastructure/logger";
import { settings } from "../../infrastructure/config/settings";
import { TelephonySession } from "../../api/telephony_adapter";
import { IVoiceProvider } from "../providers/base";
import { resamplePcm16, pcm16FrameBytes } from "../audio_resampler";
import { AudioPlayout } from "../audio_playout";

export function orchestrateCall(
  session: TelephonySession,
  provider: IVoiceProvider,
  openingGreeting?: string
): void {
  const callId = session.id;
  const { telephony, gemini, call } = settings;
  const frameBytes = pcm16FrameBytes(telephony.sampleRate, telephony.frameDurationMs);
  const playout = new AudioPlayout(frameBytes, telephony.frameDurationMs, (frame) => session.sendAudio(frame));
  let transcript = "";
  let ended = false;
  logger.call(callId, "Bridging telephony session to AI voice provider.");

  // Single, idempotent teardown path for every way a call can end
  const endCall = (reason: string): void => {
    if (ended) return;
    ended = true;
    logger.call(callId, `Call ended: ${reason}`);
    playout.clear();
    provider.disconnect();
    session.hangup();
  };

  // 1. Caller audio -> AI provider
  session.on("audio", (pcm: Buffer) => provider.sendAudio(pcm));

  // 2. AI voice -> caller, resampled to the telephony rate and paced in real time
  provider.on("audio", (pcm: Buffer) => {
    playout.enqueue(resamplePcm16(pcm, gemini.outputSampleRate, telephony.sampleRate));
  });
  provider.on("interrupted", () => playout.clear()); // caller barged in
  provider.on("text", (fragment: string) => { transcript += fragment; });
  provider.on("turnComplete", () => {
    playout.flush();
    if (call.logTranscripts && transcript) logger.call(callId, `Bricko: ${transcript.trim()}`);
    transcript = "";
  });

  // 3. AI ended the call: let the farewell finish playing before hanging up
  provider.on("hangup", () => {
    playout.flush();
    playout.whenDrained().then(() => setTimeout(() => endCall("AI completed farewell"), call.hangupGraceMs));
  });

  // 4. Lifecycle and errors (an unhandled "error" event would crash every active call)
  session.on("close", () => endCall("caller disconnected"));
  session.on("error", (err: Error) => {
    logger.error(`[${callId}] Telephony error: ${err.message}`);
    endCall("telephony error");
  });
  provider.on("close", ({ code, reason }) => endCall(`AI provider closed (${code}${reason ? `: ${reason}` : ""})`));
  provider.on("error", (err: Error) => {
    logger.error(`[${callId}] Provider error: ${err.message}`);
  });

  // 5. Connect and speak opening line
  provider.connect()
    .then(() => {
      logger.call(callId, `AI Provider ready (Asterisk channel ${session.channelUuid ?? "unknown"}).`);
      if (openingGreeting) {
        provider.sendText(`Greet the caller immediately with: "${openingGreeting}"`);
      }
    })
    .catch((err) => {
      logger.error(`[${callId}] Connection failed: ${err.message}`);
      endCall("AI provider connection failed");
    });
}
