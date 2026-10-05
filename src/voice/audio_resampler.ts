/**
 * PCM resampling and framing utilities for 16-bit mono signed-linear audio.
 * Sample rates are passed in by the caller (see settings), never assumed.
 */

const BYTES_PER_SAMPLE = 2; // 16-bit PCM
const MS_PER_SECOND = 1000;

/**
 * Resamples 16-bit mono PCM between arbitrary rates.
 * Downsampling averages each source window (a simple low-pass that reduces the
 * aliasing of plain sample dropping); upsampling repeats the nearest sample.
 */
export function resamplePcm16(pcm: Buffer, fromRate: number, toRate: number): Buffer {
  if (fromRate === toRate) return pcm;

  const inSamples = Math.floor(pcm.length / BYTES_PER_SAMPLE);
  const ratio = fromRate / toRate;
  const outSamples = Math.floor(inSamples / ratio);
  const out = Buffer.alloc(outSamples * BYTES_PER_SAMPLE);

  for (let i = 0; i < outSamples; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.max(start + 1, Math.min(inSamples, Math.floor((i + 1) * ratio)));
    let sum = 0;
    for (let s = start; s < end; s++) sum += pcm.readInt16LE(s * BYTES_PER_SAMPLE);
    out.writeInt16LE(Math.round(sum / (end - start)), i * BYTES_PER_SAMPLE);
  }

  return out;
}

/** Size in bytes of one PCM frame of the given duration (e.g. 8 kHz x 20 ms = 320 bytes). */
export function pcm16FrameBytes(sampleRate: number, frameDurationMs: number): number {
  return Math.round((sampleRate * frameDurationMs) / MS_PER_SECOND) * BYTES_PER_SAMPLE;
}
