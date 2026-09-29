/**
 * Bricko Voice Core — Service Entry Point.
 */

import { settings } from "./infrastructure/config/settings";
import { logger } from "./infrastructure/logger";
import { TelephonyAdapter } from "./api/telephony_adapter";
import { GeminiLiveProvider } from "./voice/providers/gemini_provider";
import { orchestrateCall } from "./voice/orchestration/call_orchestrator";
import { BRICKO_SYSTEM_PROMPT, INITIAL_GREETING } from "./prompts";

async function bootstrap(): Promise<void> {
  logger.info(`Starting Bricko Voice Core on ${settings.telephony.host}:${settings.telephony.port}`);
  logger.info(`Model: ${settings.gemini.model} | Voice: ${settings.gemini.voice}`);

  const adapter = new TelephonyAdapter();

  adapter.on("call", (session) => {
    logger.call(session.id, "New call connected.");
    const provider = new GeminiLiveProvider({
      systemInstruction: BRICKO_SYSTEM_PROMPT,
    });
    orchestrateCall(session, provider, INITIAL_GREETING);
  });

  await adapter.start();
  logger.info("Telephony Ingress Adapter is live and listening for calls.");
}

bootstrap().catch((err) => {
  logger.error("Fatal startup error:", err);
  process.exit(1);
});
