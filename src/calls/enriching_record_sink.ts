/**
 * Call record sink that runs post-call transcript processing (language, Roman
 * letters, English translation per turn) before handing the record to the next
 * sink. If processing is disabled or fails, the record is still saved with the
 * original transcript and a transcript_processing status saying why.
 */

import { settings } from "../infrastructure/config/settings";
import { logger } from "../infrastructure/logger";
import { CallRecord } from "./call_record";
import { CallRecordSink } from "./call_record_sink";
import { enrichTranscript } from "./transcript_enrichment";

export class EnrichingCallRecordSink implements CallRecordSink {
  constructor(private readonly next: CallRecordSink) {}

  public async save(record: CallRecord): Promise<void> {
    const model = settings.gemini.textModel;
    if (!settings.transcript.enrichment) {
      record.setProcessing({ status: "skipped", model: null, error: "TRANSCRIPT_ENRICHMENT is off" });
    } else {
      try {
        const enrichment = await enrichTranscript(record.transcript.toJSON());
        record.setProcessing({ status: "done", model, error: null }, enrichment);
      } catch (err) {
        const message = (err as Error).message;
        logger.warn(`[${record.callId}] Transcript processing failed, saving original transcript: ${message}`);
        record.setProcessing({ status: "failed", model, error: message });
      }
    }
    await this.next.save(record);
  }
}
