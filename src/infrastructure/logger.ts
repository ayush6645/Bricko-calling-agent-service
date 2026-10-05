/**
 * Minimal structured logger.
 * Timestamps show the full date and time in the configured zone (LOG_TIMEZONE).
 */

import { settings } from "./config/settings";

// "sv-SE" formats as YYYY-MM-DD HH:mm:ss; an invalid zone throws here, at startup
const formatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: settings.logging.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function timestamp(): string {
  return formatter.format(new Date());
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
