/**
 * Destinations for finished call records. Today records go to the log as one
 * JSON line; a database sink can implement the same interface later.
 */

import { logger } from "../infrastructure/logger";
import { CallRecord } from "./call_record";

export interface CallRecordSink {
  save(record: CallRecord): Promise<void>;
}

/** Marker that makes call records easy to grep out of the logs. */
export const CALL_RECORD_LOG_TAG = "CALL_RECORD";

export class LogCallRecordSink implements CallRecordSink {
  public async save(record: CallRecord): Promise<void> {
    logger.call(record.callId, `${CALL_RECORD_LOG_TAG} ${JSON.stringify(record)}`);
  }
}
