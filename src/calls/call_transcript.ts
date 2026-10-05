/**
 * Two-sided call transcript built from streaming transcription fragments.
 * Turns are kept in spoken order only: live transcription timing is not exact,
 * so no per-turn timestamps are recorded (call-level times live in CallRecord).
 */

/** Same speaker labels as chat_messages.sender, so calls and chats line up per lead. */
export const SPEAKERS = { caller: "lead", ai: "bricko" } as const;
export type Speaker = (typeof SPEAKERS)[keyof typeof SPEAKERS];

export interface TranscriptTurn {
  seq: number;
  speaker: Speaker;
  text: string;
  /** True when the caller spoke over the AI and cut this turn short. */
  interrupted: boolean;
}

type TurnListener = (turn: TranscriptTurn) => void;

export class CallTranscript {
  private readonly turns: TranscriptTurn[] = [];
  private callerBuffer = "";
  private aiBuffer = "";

  constructor(private readonly onTurn: TurnListener = () => {}) {}

  public appendCaller(fragment: string): void {
    this.callerBuffer += fragment;
  }

  /** The AI starting a new turn closes the caller's turn it is replying to. */
  public appendAi(fragment: string): void {
    if (!this.aiBuffer) this.commit("callerBuffer", SPEAKERS.caller, false);
    this.aiBuffer += fragment;
  }

  /** The AI finished (or was cut off); caller speech heard meanwhile stays buffered. */
  public endAiTurn(interrupted: boolean): void {
    this.commit("aiBuffer", SPEAKERS.ai, interrupted);
  }

  /** Call is over: commit whatever is still buffered, in spoken order. */
  public finish(): void {
    this.commit("aiBuffer", SPEAKERS.ai, false);
    this.commit("callerBuffer", SPEAKERS.caller, false);
  }

  public toJSON(): TranscriptTurn[] {
    return [...this.turns];
  }

  private commit(buffer: "callerBuffer" | "aiBuffer", speaker: Speaker, interrupted: boolean): void {
    const text = this[buffer].replace(/\s+/g, " ").trim();
    this[buffer] = "";
    if (!text) return;
    const turn = { seq: this.turns.length + 1, speaker, text, interrupted };
    this.turns.push(turn);
    this.onTurn(turn);
  }
}
