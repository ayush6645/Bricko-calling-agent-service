/**
 * AudioSocket protocol framing (Asterisk app_audiosocket).
 * Field widths and frame types are named constants from the protocol spec;
 * offsets and header size are computed from them.
 */

// Protocol Header Field Widths (in bytes)
export const TYPE_FIELD_BYTES = 1;
export const LENGTH_FIELD_BYTES = 2;
export const HEADER_SIZE_BYTES = TYPE_FIELD_BYTES + LENGTH_FIELD_BYTES;

// Byte Offsets within Frame Header
export const TYPE_BYTE_OFFSET = 0;
export const LENGTH_BYTE_OFFSET = TYPE_BYTE_OFFSET + TYPE_FIELD_BYTES;
export const PAYLOAD_START_OFFSET = HEADER_SIZE_BYTES;

// AudioSocket Message Opcodes
export const AudioSocketMessageType = {
  HANGUP: 0x00,
  UUID: 0x01,
  SILENCE: 0x02,
  AUDIO: 0x10,
  ERROR: 0xff,
} as const;

export type AudioSocketType = typeof AudioSocketMessageType[keyof typeof AudioSocketMessageType];

export interface DecodedFrame {
  type: number;
  payload: Buffer;
  remainingBuffer: Buffer;
}

const EMPTY_PAYLOAD = Buffer.alloc(0);

/**
 * Builds a valid AudioSocket frame: [1 byte Type][2 bytes Length BE][Payload].
 */
export function buildAudioSocketFrame(
  type: AudioSocketType,
  payload: Buffer = EMPTY_PAYLOAD
): Buffer {
  const header = Buffer.alloc(HEADER_SIZE_BYTES);
  header.writeUInt8(type, TYPE_BYTE_OFFSET);
  header.writeUInt16BE(payload.length, LENGTH_BYTE_OFFSET);
  return payload.length > 0 ? Buffer.concat([header, payload]) : header;
}

/**
 * Formats the 16-byte UUID payload Asterisk sends first on every connection.
 */
export function decodeUuidPayload(payload: Buffer): string {
  const hex = payload.toString("hex");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

/**
 * Parses the next AudioSocket frame from an accumulated byte buffer.
 */
export function parseAudioFrame(buffer: Buffer): DecodedFrame | null {
  if (buffer.length < HEADER_SIZE_BYTES) return null;

  const type = buffer.readUInt8(TYPE_BYTE_OFFSET);
  const payloadLength = buffer.readUInt16BE(LENGTH_BYTE_OFFSET);
  const totalFrameSize = HEADER_SIZE_BYTES + payloadLength;

  if (buffer.length < totalFrameSize) return null;

  return {
    type,
    payload: buffer.subarray(PAYLOAD_START_OFFSET, totalFrameSize),
    remainingBuffer: buffer.subarray(totalFrameSize),
  };
}
