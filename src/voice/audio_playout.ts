/**
 * Real-time paced audio playout for the telephony leg.
 * Releases fixed-size PCM frames at the rate the phone plays them, so audio is
 * never dumped in bursts, and queued speech can be dropped when the caller barges in.
 */

export class AudioPlayout {
  private pending: Buffer = Buffer.alloc(0);
  private timer: NodeJS.Timeout | null = null;
  private startedAt = 0;
  private framesSent = 0;
  private flushRequested = false;
  private drainWaiters: Array<() => void> = [];

  constructor(
    private readonly frameBytes: number,
    private readonly frameDurationMs: number,
    private readonly sink: (frame: Buffer) => void
  ) {}

  public enqueue(pcm: Buffer): void {
    this.pending = Buffer.concat([this.pending, pcm]);
    if (!this.timer) this.start();
  }

  /** End of a spoken turn: a trailing partial frame is padded with silence and sent. */
  public flush(): void {
    this.flushRequested = true;
    if (!this.timer && this.pending.length > 0) this.start();
  }

  /** Drops all queued audio immediately (caller interrupted, or call ended). */
  public clear(): void {
    this.pending = Buffer.alloc(0);
    this.flushRequested = false;
    this.stopTimer();
    this.resolveDrained();
  }

  /** Resolves once every queued frame has been played out. */
  public whenDrained(): Promise<void> {
    if (!this.timer && this.pending.length === 0) return Promise.resolve();
    return new Promise((resolve) => this.drainWaiters.push(resolve));
  }

  private start(): void {
    this.startedAt = Date.now();
    this.framesSent = 0;
    this.timer = setInterval(() => this.tick(), this.frameDurationMs);
    this.tick();
  }

  // Sends every frame that is due by wall-clock time, compensating for timer drift.
  private tick(): void {
    const due = Math.floor((Date.now() - this.startedAt) / this.frameDurationMs) + 1;
    while (this.framesSent < due && this.hasFrame()) {
      this.sink(this.nextFrame());
      this.framesSent++;
    }
    if (this.hasFrame()) return;
    this.stopTimer(); // underrun: re-anchor the clock when more audio arrives
    if (this.pending.length === 0) this.resolveDrained();
  }

  private hasFrame(): boolean {
    return this.pending.length >= this.frameBytes || (this.flushRequested && this.pending.length > 0);
  }

  private nextFrame(): Buffer {
    const frame = Buffer.alloc(this.frameBytes); // zero-filled, so a short tail is padded with silence
    const take = Math.min(this.frameBytes, this.pending.length);
    this.pending.copy(frame, 0, 0, take);
    this.pending = this.pending.subarray(take);
    if (this.pending.length === 0) this.flushRequested = false;
    return frame;
  }

  private stopTimer(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private resolveDrained(): void {
    this.drainWaiters.splice(0).forEach((resolve) => resolve());
  }
}
