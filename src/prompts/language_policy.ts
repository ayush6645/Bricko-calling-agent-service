/**
 * Language section of the system prompt, built from LANGUAGE_* settings:
 * open in the default language, switch on an explicit request or a full
 * sentence in another supported language, never on code-mixed property terms.
 */

import { LanguageSettings, languageName, languageLabel } from "../infrastructure/config/language_settings";

export function buildLanguagePolicy(language: LanguageSettings): string {
  const opening = languageName(language.defaultLanguage);
  const fallback = languageName(language.fallbackLanguage);
  const supported = language.supported.map(languageLabel).join(", ");

  return `
LANGUAGE RULES (follow strictly for the whole call):
- Supported languages: ${supported}. No other languages.
- The call starts in ${opening}. Speak natural, everyday ${opening} as people in India speak it on the phone: common English property terms (BHK, budget, carpet area, possession, EMI, loan, project and place names) stay in English.
- Keep the current language until one of these happens:
  1. The caller asks you to speak another supported language, in any words or language (e.g. "English mein baat karo", "please speak in Marathi"). Switch immediately and confirm in one short sentence in the new language.
  2. The caller speaks a full sentence in another supported language. Switch silently: simply reply in that language without announcing the change.
- Languages that share a script or many words (e.g. Hindi and Marathi) are still different languages: identify the caller's language from their words and grammar, not from the script, and reply in exactly that language. For example, "मला 2 BHK हवा आहे" is Marathi (मला, हवा, आहे), not Hindi, so the reply must be in Marathi.
- These are NOT a reason to switch: English property terms or names inside a ${opening} sentence; short words such as "ok", "yes", "haan", "hello"; numbers; unclear or noisy audio (ask the caller to repeat, in the current language).
- After a switch, keep using the new language for the rest of the call until the caller switches again or asks for another language.
- Never reply in English unless the caller speaks English or asks for English.
- If the caller speaks a language that is not supported, say once, politely and in ${fallback}, that you can talk in ${supported}; then continue in ${fallback}.
- Every reply is in exactly one language, from its first word to its last: never start in one language and continue in another. Questions, clarifications, empathy and the farewell are all in the current language.
- Say amounts the Indian way in every language: lakh and crore, never million or billion.
- Use the respectful form of address of the current language (e.g. "aap" in Hindi, "tumhi" in Marathi).
`.trim();
}
