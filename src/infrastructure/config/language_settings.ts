/**
 * Conversation-language settings (BCP-47 codes such as "hi-IN"):
 *   LANGUAGE_SUPPORTED  languages the agent may switch to (comma separated)
 *   LANGUAGE_DEFAULT    language of the greeting and of every call's opening
 *   LANGUAGE_FALLBACK   language used when the caller speaks an unsupported one
 * Display names come from the runtime's locale data, not a hand-written list.
 */

const BCP47_PATTERN = /^[a-z]{2,3}(-[A-Z]{2})?$/;
const DEFAULT_SUPPORTED = "hi-IN,en-IN,mr-IN,kn-IN,te-IN,bn-IN,ta-IN,gu-IN,ml-IN";
const DEFAULT_LANGUAGE = "hi-IN";

export interface LanguageSettings {
  defaultLanguage: string;
  fallbackLanguage: string;
  supported: string[];
}

const displayNames = new Intl.DisplayNames(["en"], { type: "language" });

/** English name of a language code, e.g. "mr-IN" -> "Marathi". */
export function languageName(code: string): string {
  const base = code.split("-")[0];
  return displayNames.of(base) ?? code;
}

/** English plus native name, e.g. "bn-IN" -> "Bangla (বাংলা)", so the model recognises it either way. */
export function languageLabel(code: string): string {
  const base = code.split("-")[0];
  const english = languageName(code);
  const native = new Intl.DisplayNames([base], { type: "language" }).of(base);
  return native && native !== english ? `${english} (${native})` : english;
}

function fail(message: string): never {
  throw new Error(`[Settings] ${message}`);
}

export function loadLanguageSettings(env: NodeJS.ProcessEnv): LanguageSettings {
  const supported = (env.LANGUAGE_SUPPORTED || DEFAULT_SUPPORTED)
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);
  const defaultLanguage = (env.LANGUAGE_DEFAULT || DEFAULT_LANGUAGE).trim();
  const fallbackLanguage = (env.LANGUAGE_FALLBACK || defaultLanguage).trim();

  const invalid = [...supported, defaultLanguage, fallbackLanguage].filter((c) => !BCP47_PATTERN.test(c));
  if (invalid.length) fail(`Invalid language code(s): ${invalid.join(", ")} (expected e.g. hi-IN)`);
  if (new Set(supported).size !== supported.length) fail("LANGUAGE_SUPPORTED contains duplicates");
  if (!supported.includes(defaultLanguage)) fail(`LANGUAGE_DEFAULT ${defaultLanguage} is not in LANGUAGE_SUPPORTED`);
  if (!supported.includes(fallbackLanguage)) fail(`LANGUAGE_FALLBACK ${fallbackLanguage} is not in LANGUAGE_SUPPORTED`);

  return { defaultLanguage, fallbackLanguage, supported };
}
