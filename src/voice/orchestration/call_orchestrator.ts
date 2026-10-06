/**
 * Call Orchestrator: Wires the telephony audio stream to the Voice AI provider.
 */

import { logger } from "../../infrastructure/logger";
import { settings } from "../../infrastructure/config/settings";
import { TelephonySession } from "../../api/telephony_adapter";
import { IVoiceProvider } from "../providers/base";
import { resamplePcm16, pcm16FrameBytes } from "../audio_resampler";
import { AudioPlayout } from "../audio_playout";
import { attachCallRecord } from "./call_recording";
import { CallMetadataRegistry } from "../../calls/call_metadata_registry";
import { CallRecordSink } from "../../calls/call_record_sink";

export interface CallDependencies {
  registry: CallMetadataRegistry;
  sink: CallRecordSink;
}

export function orchestrateCall(
  session: TelephonySession,
  provider: IVoiceProvider,
  deps: CallDependencies,
  openingInstruction?: string
): void {
  const callId = session.id;
  const { telephony, gemini, call } = settings;
  const frameBytes = pcm16FrameBytes(telephony.sampleRate, telephony.frameDurationMs);
  const playout = new AudioPlayout(frameBytes, telephony.frameDurationMs, (frame) => session.sendAudio(frame));
  const record = attachCallRecord(session, provider, deps.registry);
  let ended = false;
  logger.call(callId, "Bridging telephony session to AI voice provider.");

  // Single, idempotent teardown path for every way a call can end
  const endCall = (reason: string): void => {
    if (ended) return;
    ended = true;
    record.end(reason);
    logger.call(callId, `Call ended: ${reason} (duration ${record.durationSec?.toFixed(1)}s)`);
    playout.clear();
    provider.disconnect();
    session.hangup();
    deps.sink.save(record).catch((err: Error) => logger.error(`[${callId}] Saving call record failed: ${err.message}`));
  };

  // 1. Caller audio -> AI provider
  session.on("audio", (pcm: Buffer) => provider.sendAudio(pcm));

  // 2. AI voice -> caller, resampled to the telephony rate and paced in real time
  provider.on("audio", (pcm: Buffer) => {
    playout.enqueue(resamplePcm16(pcm, gemini.outputSampleRate, telephony.sampleRate));
  });
  provider.on("interrupted", () => playout.clear()); // caller barged in
  provider.on("turnComplete", () => playout.flush());

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
      if (openingInstruction) provider.sendText(openingInstruction);
    })
    .catch((err) => {
      logger.error(`[${callId}] Connection failed: ${err.message}`);
      endCall("AI provider connection failed");
    });
}
