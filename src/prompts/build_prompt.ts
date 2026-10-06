/**
 * Assembles the system prompt sent to the voice provider at the start of each call.
 */

import { settings } from "../infrastructure/config/settings";
import { languageName } from "../infrastructure/config/language_settings";
import { PERSONA_PROMPT, INITIAL_GREETING } from "./persona";
import { buildLanguagePolicy } from "./language_policy";

export function buildSystemPrompt(): string {
  return [PERSONA_PROMPT, buildLanguagePolicy(settings.language)].join("\n\n");
}

/** First message to the model: speak the fixed greeting in the default language. */
export function buildOpeningInstruction(): string {
  const opening = languageName(settings.language.defaultLanguage);
  return `Greet the caller immediately in ${opening}, word for word: "${INITIAL_GREETING}"`;
}
