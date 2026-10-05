/**
 * Matches caller details posted by the gateway with the AudioSocket session
 * that carries the same call UUID. Either side may arrive first: details wait
 * for their call, or a call waits for its details, each for at most the TTL.
 */

import { CallerMetadata } from "./call_metadata";

type MetadataHandler = (metadata: CallerMetadata) => void;

interface Expiring<T> {
  value: T;
  expiry: NodeJS.Timeout;
}

/** UUIDs are compared case-insensitively (Asterisk and Node may format hex differently). */
export function normalizeUuid(uuid: string): string {
  return uuid.trim().toLowerCase();
}

export class CallMetadataRegistry {
  private readonly pending = new Map<string, Expiring<CallerMetadata>>();
  private readonly waiting = new Map<string, Expiring<MetadataHandler>>();

  constructor(private readonly ttlMs: number) {}

  /** Called when the gateway posts details: hand them to a waiting call, or keep them. */
  public put(callUuid: string, metadata: CallerMetadata): void {
    const key = normalizeUuid(callUuid);
    const waiter = this.remove(this.waiting, key);
    if (waiter) return waiter(metadata);
    this.store(this.pending, key, metadata);
  }

  /**
   * Called when a call learns its UUID. The handler runs now if details are
   * already here (`isReady`), otherwise when they arrive; `cancel` stops waiting.
   */
  public claim(callUuid: string, handler: MetadataHandler): { cancel: () => void; isReady: boolean } {
    const key = normalizeUuid(callUuid);
    const metadata = this.remove(this.pending, key);
    if (metadata) {
      handler(metadata);
      return { cancel: () => {}, isReady: true };
    }
    this.store(this.waiting, key, handler);
    return { cancel: () => this.remove(this.waiting, key), isReady: false };
  }

  public get size(): number {
    return this.pending.size + this.waiting.size;
  }

  private store<T>(map: Map<string, Expiring<T>>, key: string, value: T): void {
    this.remove(map, key);
    const expiry = setTimeout(() => map.delete(key), this.ttlMs);
    expiry.unref(); // never keep the process alive just for cleanup
    map.set(key, { value, expiry });
  }

  private remove<T>(map: Map<string, Expiring<T>>, key: string): T | null {
    const entry = map.get(key);
    if (!entry) return null;
    clearTimeout(entry.expiry);
    map.delete(key);
    return entry.value;
  }
}
