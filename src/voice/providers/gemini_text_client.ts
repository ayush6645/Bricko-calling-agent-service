/**
 * Minimal client for Gemini's text generateContent API (non-live work such as
 * post-call transcript processing). Requests JSON that matches a response schema,
 * with a per-attempt timeout and retries for network or server errors.
 */

import { settings } from "../../infrastructure/config/settings";

export interface JsonRequest {
  systemInstruction: string;
  userContent: string;
  /** Gemini response schema (OpenAPI subset) the JSON reply must follow. */
  responseSchema: Record<string, unknown>;
  timeoutMs: number;
  retries: number;
}

const HTTP_SERVER_ERROR = 500;

class NonRetryableError extends Error {}

async function attempt(req: JsonRequest): Promise<unknown> {
  const { host, apiKey, textModel, textApiVersion } = settings.gemini;
  const url = `https://${host}/${textApiVersion}/models/${textModel}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(req.timeoutMs),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: req.userContent }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: req.responseSchema },
    }),
  });
  const body: any = await response.json();
  if (!response.ok) {
    const message = `Gemini text API ${response.status}: ${body.error?.message ?? "unknown error"}`;
    // Client errors (bad request, auth) will not succeed on retry
    throw response.status < HTTP_SERVER_ERROR ? new NonRetryableError(message) : new Error(message);
  }
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("Gemini text API returned no content");
  return JSON.parse(text);
}

/** Returns the parsed JSON reply, retrying network/server failures up to `retries` times. */
export async function generateJson(req: JsonRequest): Promise<unknown> {
  for (let attemptNo = 0; ; attemptNo++) {
    try {
      return await attempt(req);
    } catch (err) {
      if (err instanceof NonRetryableError || attemptNo >= req.retries) throw err;
    }
  }
}
