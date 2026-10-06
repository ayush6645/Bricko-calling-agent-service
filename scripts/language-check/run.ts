/**
 * Language behaviour check: plays each scripted caller (scenarios.ts) against the
 * real system prompt over Gemini Live, has the text model identify the language of
 * every reply (judge.ts) and reports pass rates. Repeat with LANGUAGE_CHECK_RUNS
 * to measure consistency; LANGUAGE_CHECK_ONLY="Marathi" runs only scenarios whose
 * name contains that text.  Usage: npm run test:language
 */

import { GeminiLiveProvider } from "../../src/voice/providers/gemini_provider";
import { buildSystemPrompt, buildOpeningInstruction } from "../../src/prompts/build_prompt";
import { SCENARIOS, Turn } from "./scenarios";
import { judge } from "./judge";

const isEnglish = (code: string) => code.split("-")[0] === "en";
const RUNS = Number(process.env.LANGUAGE_CHECK_RUNS) || 1;
const TIMEOUT_MS = Number(process.env.LANGUAGE_CHECK_TIMEOUT_MS) || 90000;
const PAUSE_BETWEEN_TURNS_MS = 300;

/** Plays one scenario; resolves with the agent's reply to each turn. */
function play(turns: Turn[]): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const provider = new GeminiLiveProvider({ systemInstruction: buildSystemPrompt() });
    const replies: string[] = [];
    let reply = "";
    const finish = (err?: Error) => { clearTimeout(timer); provider.disconnect(); err ? reject(err) : resolve(replies); };
    const timer = setTimeout(() => finish(new Error("timed out waiting for a reply")), TIMEOUT_MS);
    const sendNext = () =>
      replies.length >= turns.length ? finish() : provider.sendText(turns[replies.length].caller || buildOpeningInstruction());

    provider.on("text", (fragment: string) => { reply += fragment; });
    provider.on("turnComplete", () => {
      if (!reply.trim()) return; // ignore empty turn boundaries
      replies.push(reply.trim());
      reply = "";
      setTimeout(sendNext, PAUSE_BETWEEN_TURNS_MS);
    });
    provider.on("error", (err: Error) => finish(err));
    provider.connect().then(sendNext, finish);
  });
}

async function main(): Promise<void> {
  const count = { pass: 0, fail: 0, error: 0 };
  const only = process.env.LANGUAGE_CHECK_ONLY;
  const selected = Object.entries(SCENARIOS).filter(([name]) => !only || name.includes(only));
  for (const [name, turns] of selected) {
    console.log(`\n## ${name}`);
    for (let run = 1; run <= RUNS; run++) {
      const replies = await play(turns).catch((err: Error) => { console.log(`   run ${run}: ERROR ${err.message}`); return []; });
      count.error += turns.length - replies.length; // turns never answered
      for (const [i, text] of replies.entries()) {
        const turn = turns[i];
        if (turn.caller) console.log(`   caller: ${turn.caller}${await englishOf(turn.caller)}`);
        // Judge/network failures are errors of this tool, not failures of the agent
        const verdict = await judge(text).catch((err: Error) => err);
        if (verdict instanceof Error) {
          count.error++;
          console.log(`   bricko: ${text}\n           ERROR (judge: ${verdict.message}) ${turn.note}`);
          continue;
        }
        const ok = verdict.language === turn.expect;
        count[ok ? "pass" : "fail"]++;
        const english = isEnglish(verdict.language) ? "" : `\n           english: ${verdict.english}`;
        console.log(`   bricko: ${text}${english}\n           ${ok ? "PASS" : "FAIL"} [${verdict.language}, expected ${turn.expect}] ${turn.note}`);
      }
    }
  }
  console.log(`\nOverall: ${count.pass} passed, ${count.fail} failed, ${count.error} errors (${RUNS} run(s) per scenario)`);
  process.exit(count.fail || count.error ? 1 : 0);
}

/** English translation of a non-English caller line, for readable output. */
async function englishOf(text: string): Promise<string> {
  const verdict = await judge(text).catch(() => null);
  return verdict && !isEnglish(verdict.language) ? `\n           english: ${verdict.english}` : "";
}

main();
