/**
 * Call-control actions the AI can trigger during a conversation.
 * Shared by the persona prompt (which tells the model when to use them)
 * and the voice provider (which declares them as callable functions).
 */

export interface CallAction {
  name: string;
  description: string;
}

export const CALL_ACTIONS = {
  END_CALL: {
    name: "end_call",
    description:
      "Ends the phone call. Call this only after you have finished speaking your farewell to the caller.",
  },
} as const satisfies Record<string, CallAction>;

export const ALL_CALL_ACTIONS: CallAction[] = Object.values(CALL_ACTIONS);
