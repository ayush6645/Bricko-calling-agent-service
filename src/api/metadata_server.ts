/**
 * Local HTTP endpoint for call metadata: POST {METADATA_PATH}/{call-uuid}
 * with a URL-encoded body of caller details (see calls/call_metadata.ts).
 * Bind it to loopback only; the Asterisk gateway on the same host is the only client.
 */

import http from "http";
import { settings } from "../infrastructure/config/settings";
import { logger } from "../infrastructure/logger";
import { parseCallerMetadata } from "../calls/call_metadata";
import { CallMetadataRegistry } from "../calls/call_metadata_registry";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const HTTP = { noContent: 204, badRequest: 400, notFound: 404, tooLarge: 413 } as const;

export class MetadataServer {
  private server: http.Server | null = null;

  constructor(private readonly registry: CallMetadataRegistry) {}

  public start(): Promise<void> {
    const { host, port } = settings.metadata;
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handle(req, res));
      this.server.once("error", reject); // e.g. port already in use
      this.server.listen(port, host, () => resolve());
    });
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse): void {
    const callUuid = this.extractUuid(req);
    if (!callUuid) return this.reply(res, HTTP.notFound);

    let body = "";
    let tooLarge = false;
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      if (tooLarge) return; // keep draining, but stop buffering
      body += chunk;
      tooLarge = Buffer.byteLength(body) > settings.metadata.maxBodyBytes;
    });
    req.on("end", () => {
      if (tooLarge) return this.reply(res, HTTP.tooLarge);
      logger.info(`Caller details received for call ${callUuid}`);
      this.registry.put(callUuid, parseCallerMetadata(body));
      this.reply(res, HTTP.noContent);
    });
    req.on("error", () => this.reply(res, HTTP.badRequest));
  }

  /** Returns the call UUID for POST {path}/{uuid}, or null for any other request. */
  private extractUuid(req: http.IncomingMessage): string | null {
    if (req.method !== "POST" || !req.url) return null;
    const { pathname } = new URL(req.url, "http://localhost");
    // Tolerate METADATA_PATH with or without leading/trailing slashes ("calls", "/calls/")
    const base = settings.metadata.path.replace(/^\/+|\/+$/g, "");
    const prefix = base ? `/${base}/` : "/";
    if (!pathname.startsWith(prefix)) return null;
    const candidate = pathname.slice(prefix.length);
    return UUID_PATTERN.test(candidate) ? candidate : null;
  }

  private reply(res: http.ServerResponse, status: number): void {
    if (!res.headersSent) res.writeHead(status).end();
  }
}
