/**
 * Call Orchestrator: Wires the telephony audio stream to the Voice AI provider.
 */

import { logger } from "../../infrastructure/logger";
import { TelephonySession } from "../../api/telephony_adapter";
import { IVoiceProvider } from "../providers/base";

const AUTO_HANGUP_GRACE_PERIOD_MS = 1500;

export function orchestrateCall(
  session: TelephonySession,
  provider: IVoiceProvider,
  openingGreeting?: string
): void {
  const callId = session.id;
  logger.call(callId, "Bridging telephony session to AI voice provider.");

  // 1. Caller Audio -> AI Provider
  session.on("audio", (pcm: Buffer) => {
    provider.sendAudio(pcm);
  });

  // 2. AI Voice Audio -> Caller's Phone Speaker
  provider.on("audio", (pcm: Buffer) => {
    session.sendAudio(pcm);
  });

  // 3. Auto-Hangup detection (farewell detected)
  provider.on("hangup", () => {
    setTimeout(() => {
      session.hangup();
      provider.disconnect();
    }, AUTO_HANGUP_GRACE_PERIOD_MS);
  });

  // 4. Cleanup when call ends
  session.on("close", () => {
    logger.call(callId, "Call terminated.");
    provider.disconnect();
  });

  provider.on("error", (err: Error) => {
    logger.error(`[${callId}] Provider error: ${err.message}`);
  });

  // 5. Connect and speak opening line
  provider.connect()
    .then(() => {
      logger.call(callId, "AI Provider ready.");
      if (openingGreeting) {
        provider.sendText(`Greet the caller immediately with: "${openingGreeting}"`);
      }
    })
    .catch((err) => {
      logger.error(`[${callId}] Connection failed: ${err.message}`);
      session.hangup();
    });
}
