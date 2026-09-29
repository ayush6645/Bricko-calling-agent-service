/**
 * Minimal structured logger.
 */

function timestamp(): string {
  return new Date().toISOString().substring(11, 19);
}

export const logger = {
  info: (msg: string, ...args: any[]) =>
    console.log(`[${timestamp()}][INFO] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) =>
    console.warn(`[${timestamp()}][WARN] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) =>
    console.error(`[${timestamp()}][ERROR] ${msg}`, ...args),
  call: (callId: string, msg: string, ...args: any[]) =>
    console.log(`[${timestamp()}][${callId}] ${msg}`, ...args),
};
