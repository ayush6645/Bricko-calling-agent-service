/**
 * Scripted callers for the language check. Each turn names the language the
 * agent's reply must be in (the opening turn is the greeting itself).
 * Caller lines are sent as text, so this checks the prompt's language rules,
 * not speech recognition.
 */

export interface Turn {
  /** What the caller says; empty for the opening greeting. */
  caller: string;
  /** Language code the reply must be in. */
  expect: string;
  note: string;
}

const OPEN: Turn = { caller: "", expect: "hi-IN", note: "greeting opens in Hindi" };

export const SCENARIOS: Record<string, Turn[]> = {
  "Hinglish stays Hindi": [
    OPEN,
    { caller: "Mujhe Baner mein 2 BHK chahiye, budget 90 lakh, possession next year.", expect: "hi-IN", note: "English property terms are not a switch" },
    { caller: "Ok, yes.", expect: "hi-IN", note: "short English words are not a switch" },
  ],
  "Explicit English, keep it, back to Hindi": [
    OPEN,
    { caller: "Kya aap English mein baat kar sakte hain please?", expect: "en-IN", note: "explicit request" },
    { caller: "What price range is there in Baner?", expect: "en-IN", note: "stays in English" },
    { caller: "Theek hai, ab Hindi mein bataiye.", expect: "hi-IN", note: "explicit request back to Hindi" },
  ],
  "Explicit request for Marathi (asked in English)": [
    OPEN,
    { caller: "Please speak in Marathi.", expect: "mr-IN", note: "explicit request" },
  ],
  "Marathi detected": [OPEN, { caller: "मला बाणेर मध्ये दोन बीएचके फ्लॅट हवा आहे.", expect: "mr-IN", note: "full sentence, silent switch" }],
  "Kannada detected": [OPEN, { caller: "ನನಗೆ ಬೆಂಗಳೂರಿನಲ್ಲಿ ಎರಡು ಬಿಎಚ್‌ಕೆ ಫ್ಲಾಟ್ ಬೇಕು.", expect: "kn-IN", note: "full sentence, silent switch" }],
  "Telugu detected": [OPEN, { caller: "నాకు హైదరాబాద్‌లో రెండు బీహెచ్‌కే ఫ్లాట్ కావాలి.", expect: "te-IN", note: "full sentence, silent switch" }],
  "Bengali detected": [OPEN, { caller: "আমি কলকাতায় একটা দুই বিএইচকে ফ্ল্যাট খুঁজছি।", expect: "bn-IN", note: "full sentence, silent switch" }],
  "Tamil detected": [OPEN, { caller: "எனக்கு சென்னையில் இரண்டு பிஎச்கே பிளாட் வேண்டும்.", expect: "ta-IN", note: "full sentence, silent switch" }],
  "Unsupported language": [OPEN, { caller: "Bonjour, je cherche un appartement à Pune.", expect: "hi-IN", note: "fallback, lists supported languages" }],
};
