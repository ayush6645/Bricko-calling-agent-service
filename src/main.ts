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
import { EnrichingCallRecordSink } from "./calls/enriching_record_sink";
import { buildSystemPrompt, buildOpeningInstruction } from "./prompts/build_prompt";
import { languageName } from "./infrastructure/config/language_settings";

async function bootstrap(): Promise<void> {
  const { telephony, metadata, gemini, language } = settings;
  logger.info(`Starting Bricko Voice Core on ${telephony.host}:${telephony.port}`);
  logger.info(`Model: ${gemini.model} | Voice: ${gemini.voice}`);
  logger.info(
    `Languages: opens in ${languageName(language.defaultLanguage)}, fallback ${languageName(language.fallbackLanguage)}, ` +
      `supported ${language.supported.map(languageName).join(", ")}`
  );

  const deps: CallDependencies = {
    registry: new CallMetadataRegistry(metadata.ttlMs),
    sink: new EnrichingCallRecordSink(new LogCallRecordSink()),
  };
  const systemPrompt = buildSystemPrompt();
  const openingInstruction = buildOpeningInstruction();
  const adapter = new TelephonyAdapter();

  adapter.on("call", (session) => {
    logger.call(session.id, "New call connected.");
    const provider = new GeminiLiveProvider({ systemInstruction: systemPrompt });
    orchestrateCall(session, provider, deps, openingInstruction);
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
