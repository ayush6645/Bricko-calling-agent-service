/**
 * Bricko Voice Core — Service Entry Point.
 */

import { settings } from "./infrastructure/config/settings";
import { logger } from "./infrastructure/logger";
import { TelephonyAdapter } from "./api/telephony_adapter";
import { GeminiLiveProvider } from "./voice/providers/gemini_provider";
import { orchestrateCall, CallDependencies } from "./voice/orchestration/call_orchestrator";
import { MetadataServer } from "./api/metadata_server";
import { CallMetadataRegistry } from "./calls/call_metadata_registry";
import { LogCallRecordSink } from "./calls/call_record_sink";
import { BRICKO_SYSTEM_PROMPT, INITIAL_GREETING } from "./prompts";

async function bootstrap(): Promise<void> {
  const { telephony, metadata, gemini } = settings;
  logger.info(`Starting Bricko Voice Core on ${telephony.host}:${telephony.port}`);
  logger.info(`Model: ${gemini.model} | Voice: ${gemini.voice}`);

  const deps: CallDependencies = {
    registry: new CallMetadataRegistry(metadata.ttlMs),
    sink: new LogCallRecordSink(),
  };
  const adapter = new TelephonyAdapter();

  adapter.on("call", (session) => {
    logger.call(session.id, "New call connected.");
    const provider = new GeminiLiveProvider({
      systemInstruction: BRICKO_SYSTEM_PROMPT,
    });
    orchestrateCall(session, provider, deps, INITIAL_GREETING);
  });

  await new MetadataServer(deps.registry).start();
  logger.info(`Call metadata endpoint listening on ${metadata.host}:${metadata.port}${metadata.path}`);
  await adapter.start();
  logger.info("Telephony Ingress Adapter is live and listening for calls.");
}

bootstrap().catch((err) => {
  logger.error("Fatal startup error:", err);
  process.exit(1);
});
