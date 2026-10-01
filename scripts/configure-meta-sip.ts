/**
 * Points the WhatsApp Business number's SIP calling at the Bricko Asterisk gateway.
 * Dry run by default (prints Meta's current settings); pass --apply to update them.
 *
 *   npm run meta:sip            # show current settings and the planned change
 *   npm run meta:sip -- --apply # register the gateway with Meta
 */

import path from "path";
import dotenv from "dotenv";

dotenv.config(); // Meta credentials (project .env)
dotenv.config({ path: path.join(__dirname, "../gateway/.env") }); // gateway hostname/port

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function loadConfig() {
  const graphVersion = process.env.META_GRAPH_API_VERSION || "v23.0";
  return {
    settingsUrl: `https://graph.facebook.com/${graphVersion}/${requireEnv("WHATSAPP_PHONE_NUMBER_ID")}/settings`,
    headers: {
      Authorization: `Bearer ${requireEnv("WHATSAPP_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
    },
    sipServer: {
      hostname: requireEnv("SIP_PUBLIC_HOSTNAME"),
      port: Number(requireEnv("SIP_TLS_PORT")),
    },
  };
}

async function main(): Promise<void> {
  const { settingsUrl, headers, sipServer } = loadConfig();
  const graph = async (init?: RequestInit): Promise<any> => {
    const response = await fetch(settingsUrl, { headers, ...init });
    const body = await response.json();
    if (!response.ok) throw new Error(`Meta API ${response.status}: ${JSON.stringify(body.error ?? body)}`);
    return body;
  };

  const current = await graph();
  console.log("[Meta] Current calling settings:\n", JSON.stringify(current.calling, null, 2));
  console.log(`[Meta] Target SIP server: ${sipServer.hostname}:${sipServer.port}`);

  if (!process.argv.includes("--apply")) {
    console.log("[Meta] Dry run only. Re-run with --apply to update Meta.");
    return;
  }

  const calling = {
    status: "ENABLED",
    srtp_key_exchange_protocol: "SDES",
    sip: { status: "ENABLED", servers: [sipServer] },
  };
  await graph({ method: "POST", body: JSON.stringify({ calling }) });
  const updated = await graph();
  console.log("[Meta] Updated calling settings:\n", JSON.stringify(updated.calling, null, 2));
}

main().catch((err: Error) => {
  console.error(`[Meta] ${err.message}`);
  process.exit(1);
});
