import { writeFileSync } from "node:fs";

import {
  createAssistantMessageEventStream,
  type AssistantMessage,
  type AssistantMessageEventStream,
  type Model,
  type SimpleStreamOptions
} from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const chunks = [
  "固定応答を区切りごとに流します。\n\n状態 $\\frac{1}{\\sqrt 2}",
  "(\\ket{00}+\\ket{11})$",
  " です。\n\n完了後も数式を読み返せます。"
];

type FixturePhase = "incomplete" | "closed" | "complete" | "done" | "error";

function markPhase(phase: FixturePhase): void {
  const path = process.env.QNI_MATH_FIXTURE_PHASE_FILE;
  if (path) writeFileSync(path, phase);
}

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, milliseconds);
    signal?.addEventListener("abort", () => {
      clearTimeout(timeout);
      reject(new Error("Fixture response aborted"));
    }, { once: true });
  });
}

function streamFixture(
  model: Model<any>,
  _context: unknown,
  options?: SimpleStreamOptions
): AssistantMessageEventStream {
  const stream = createAssistantMessageEventStream();
  const output: AssistantMessage = {
    role: "assistant",
    content: [{ type: "text", text: "" }],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
    },
    stopReason: "pending",
    timestamp: Date.now()
  };

  void (async () => {
    try {
      stream.push({ type: "start", partial: output });
      stream.push({ type: "text_start", contentIndex: 0, partial: output });
      for (let index = 0; index < chunks.length; index += 1) {
        await wait(index === 2 ? 4_000 : 700, options?.signal);
        const block = output.content[0];
        if (block?.type !== "text") throw new Error("Fixture text block is missing");
        block.text += chunks[index]!;
        stream.push({
          type: "text_delta",
          contentIndex: 0,
          delta: chunks[index]!,
          partial: output
        });
        markPhase(index === 0 ? "incomplete" : index === 1 ? "closed" : "complete");
      }
      const block = output.content[0];
      if (block?.type !== "text") throw new Error("Fixture text block is missing");
      stream.push({ type: "text_end", contentIndex: 0, content: block.text, partial: output });
      output.stopReason = "stop";
      stream.push({ type: "done", reason: "stop", message: output });
      stream.end();
      markPhase("done");
    } catch (error) {
      output.stopReason = options?.signal?.aborted ? "aborted" : "error";
      output.errorMessage = error instanceof Error ? error.message : String(error);
      stream.push({ type: "error", reason: output.stopReason, error: output });
      stream.end();
      markPhase("error");
    }
  })();

  return stream;
}

export default function qniMathFixedProvider(pi: ExtensionAPI): void {
  pi.registerProvider("qni-math-fixture", {
    name: "qni-math fixed response fixture",
    baseUrl: "fixture://qni-math",
    apiKey: "fixture",
    api: "qni-math-fixture",
    models: [{
      id: "streaming",
      name: "qni-math streaming fixture",
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 4_096,
      maxTokens: 1_024
    }],
    streamSimple: streamFixture
  });
}
