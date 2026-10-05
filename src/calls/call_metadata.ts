/**
 * Caller and business details for one call, as posted by the Asterisk gateway.
 * The form field names are a contract with gateway/templates/extensions.conf.template.
 */

export const METADATA_FIELDS = {
  callerNumber: "caller_number",
  callerName: "caller_name",
  callerCountry: "caller_country",
  waCallId: "wa_call_id",
  waUserId: "wa_user_id",
  businessNumber: "business_number",
  businessPhoneNumberId: "business_phone_number_id",
  businessAccountId: "business_account_id",
  sipCallId: "sip_call_id",
  gatewayChannelId: "gateway_channel_id",
  // Unix epoch seconds, optionally with a fractional part ("1791199434.123")
  gatewayReceivedEpoch: "gateway_received_epoch",
  gatewayAnsweredEpoch: "gateway_answered_epoch",
} as const;

type MetadataKey = keyof typeof METADATA_FIELDS;

export interface CallerMetadata {
  caller: { number: string | null; name: string | null; country: string | null; waUserId: string | null };
  business: { number: string | null; phoneNumberId: string | null; accountId: string | null };
  ids: { waCallId: string | null; sipCallId: string | null; gatewayChannelId: string | null };
  /** When the gateway received / answered the call (UTC ISO-8601, Asterisk clock on this host) */
  gatewayReceivedAt: string | null;
  gatewayAnsweredAt: string | null;
}

const MS_PER_SECOND = 1000;

/** Epoch seconds (whole or fractional) to ISO-8601; anything unparseable becomes null. */
function epochToIso(value: string | null): string | null {
  const seconds = Number(value);
  if (!value || !Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(Math.round(seconds * MS_PER_SECOND)).toISOString();
}

/** Builds metadata from a URL-encoded form body; missing or empty fields become null. */
export function parseCallerMetadata(formBody: string): CallerMetadata {
  const params = new URLSearchParams(formBody);
  const field = (key: MetadataKey): string | null => params.get(METADATA_FIELDS[key])?.trim() || null;

  return {
    caller: {
      number: field("callerNumber"),
      name: field("callerName"),
      country: field("callerCountry"),
      waUserId: field("waUserId"),
    },
    business: {
      number: field("businessNumber"),
      phoneNumberId: field("businessPhoneNumberId"),
      accountId: field("businessAccountId"),
    },
    ids: {
      waCallId: field("waCallId"),
      sipCallId: field("sipCallId"),
      gatewayChannelId: field("gatewayChannelId"),
    },
    gatewayReceivedAt: epochToIso(field("gatewayReceivedEpoch")),
    gatewayAnsweredAt: epochToIso(field("gatewayAnsweredEpoch")),
  };
}
