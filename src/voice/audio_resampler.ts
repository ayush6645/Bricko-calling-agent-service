/**
 * Audio resampler and chunking utilities for Telephony AudioSocket.
 * Converts 24kHz Gemini PCM to standard 8kHz Telephone SLIN in 20ms frames (320 bytes).
 */

const DOWNSAMPLE_RATIO = 3; // 24000Hz / 8000Hz = 3
const BYTES_PER_SAMPLE = 2; // 16-bit PCM
const SAMPLES_PER_20MS = 160; // 8000 samples/sec * 0.020 sec = 160 samples
export const TELEPHONY_FRAME_BYTES = SAMPLES_PER_20MS * BYTES_PER_SAMPLE; // 320 bytes

export function downsample24kTo8k(pcm24k: Buffer): Buffer {
  const numSamples24k = Math.floor(pcm24k.length / BYTES_PER_SAMPLE);
  const numSamples8k = Math.floor(numSamples24k / DOWNSAMPLE_RATIO);
  const outBuffer = Buffer.alloc(numSamples8k * BYTES_PER_SAMPLE);

  for (let i = 0; i < numSamples8k; i++) {
    const sample24kOffset = i * DOWNSAMPLE_RATIO * BYTES_PER_SAMPLE;
    const sampleValue = pcm24k.readInt16LE(sample24kOffset);
    outBuffer.writeInt16LE(sampleValue, i * BYTES_PER_SAMPLE);
  }

  return outBuffer;
}

export function chunkAudio(pcm: Buffer, chunkSize: number = TELEPHONY_FRAME_BYTES): Buffer[] {
  const chunks: Buffer[] = [];
  for (let offset = 0; offset < pcm.length; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, pcm.length);
    chunks.push(pcm.subarray(offset, end));
  }
  return chunks;
}
