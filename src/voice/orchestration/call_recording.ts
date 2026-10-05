/**
 * Attaches a CallRecord to a live call: claims the caller details the gateway
 * posted for this call UUID and builds the two-sided transcript as it streams.
 */

import { logger } from "../../infrastructure/logger";
import { settings } from "../../infrastructure/config/settings";
import { TelephonySession } from "../../api/telephony_adapter";
import { IVoiceProvider } from "../providers/base";
import { CallRecord } from "../../calls/call_record";
import { CallMetadataRegistry } from "../../calls/call_metadata_registry";
import { SPEAKERS, TranscriptTurn } from "../../calls/call_transcript";

const SPEAKER_LABELS: Record<TranscriptTurn["speaker"], string> = {
  [SPEAKERS.caller]: "Caller",
  [SPEAKERS.ai]: "Bricko",
};

export function attachCallRecord(
  session: TelephonySession,
  provider: IVoiceProvider,
  registry: CallMetadataRegistry
): CallRecord {
  const callId = session.id;
  const logTurn = (turn: TranscriptTurn): void => {
    if (!settings.call.logTranscripts) return;
    const cut = turn.interrupted ? " [interrupted]" : "";
    logger.call(callId, `${SPEAKER_LABELS[turn.speaker]}: ${turn.text}${cut}`);
  };
  const record = new CallRecord(callId, logTurn);

  // Asterisk sends the call UUID first; the gateway posts caller details under the same UUID
  // (normally before audio starts, but a slow post is still attached when it lands)
  session.on("uuid", (uuid: string) => {
    record.channelUuid = uuid;
    const claim = registry.claim(uuid, (meta) => {
      record.metadata = meta;
      const who = [meta.caller.number, meta.caller.name && `(${meta.caller.name})`].filter(Boolean).join(" ");
      logger.call(callId, `Caller ${who || "unknown"} | WhatsApp call ${meta.ids.waCallId ?? "unknown"}`);
    });
    if (!claim.isReady) logger.warn(`[${callId}] Caller details not received yet for gateway call ${uuid}; waiting`);
    session.once("close", claim.cancel);
  });

  // Transcript: the caller's words are committed when the AI starts replying
  provider.on("callerText", (fragment: string) => record.transcript.appendCaller(fragment));
  provider.on("text", (fragment: string) => record.transcript.appendAi(fragment));
  provider.on("interrupted", () => record.transcript.endAiTurn(true));
  provider.on("turnComplete", () => record.transcript.endAiTurn(false));

  return record;
}
