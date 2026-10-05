/**
 * Everything known about one call, serialisable as a single snake_case JSON
 * document (the shape a future database row will store). All times are UTC
 * ISO-8601 from this host's clock and mark exact events, never estimates.
 */

import { CallerMetadata } from "./call_metadata";
import { CallTranscript, TranscriptTurn } from "./call_transcript";

const MS_PER_SECOND = 1000;

export class CallRecord {
  public readonly transcript: CallTranscript;
  public channelUuid: string | null = null;
  public metadata: CallerMetadata | null = null;
  private readonly connectedAt = new Date();
  private endedAt: Date | null = null;
  private endReason: string | null = null;

  constructor(public readonly callId: string, onTurn?: (turn: TranscriptTurn) => void) {
    this.transcript = new CallTranscript(onTurn);
  }

  /** Records the end of the call once; later calls are ignored. */
  public end(reason: string): void {
    if (this.endedAt) return;
    this.endedAt = new Date();
    this.endReason = reason;
    this.transcript.finish();
  }

  /** Duration runs from the gateway answering the call, or from agent connect if unknown. */
  public get durationBasis(): "gateway_answered_at" | "connected_at" {
    return this.metadata?.gatewayAnsweredAt ? "gateway_answered_at" : "connected_at";
  }

  public get durationSec(): number | null {
    if (!this.endedAt) return null;
    const answered = this.metadata?.gatewayAnsweredAt;
    const startMs = answered ? Date.parse(answered) : this.connectedAt.getTime();
    return (this.endedAt.getTime() - startMs) / MS_PER_SECOND;
  }

  public toJSON(): Record<string, unknown> {
    const meta = this.metadata;
    return {
      call_id: this.callId,
      gateway_call_uuid: this.channelUuid,
      wa_call_id: meta?.ids.waCallId ?? null,
      sip_call_id: meta?.ids.sipCallId ?? null,
      gateway_channel_id: meta?.ids.gatewayChannelId ?? null,
      caller: meta && {
        number: meta.caller.number,
        name: meta.caller.name,
        country: meta.caller.country,
        wa_user_id: meta.caller.waUserId,
      },
      business: meta && {
        number: meta.business.number,
        phone_number_id: meta.business.phoneNumberId,
        account_id: meta.business.accountId,
      },
      gateway_received_at: meta?.gatewayReceivedAt ?? null,
      gateway_answered_at: meta?.gatewayAnsweredAt ?? null,
      connected_at: this.connectedAt.toISOString(),
      ended_at: this.endedAt?.toISOString() ?? null,
      duration_sec: this.durationSec,
      duration_basis: this.durationBasis,
      end_reason: this.endReason,
      transcript: this.transcript.toJSON(),
    };
  }
}
