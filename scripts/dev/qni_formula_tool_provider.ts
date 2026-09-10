import {
  createAssistantMessageEventStream,
  type AssistantMessage,
  type AssistantMessageEventStream,
  type Model,
  type SimpleStreamOptions
} from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const toolCallId = "qni-formula-tool-call";
let requestedFormula = false;

function message(model: Model<any>): AssistantMessage {
  return {
    role: "assistant",
    content: [],
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
}

function streamFixture(
  model: Model<any>,
  _context: unknown,
  _options?: SimpleStreamOptions
): AssistantMessageEventStream {
  const stream = createAssistantMessageEventStream();
  const output = message(model);

  setTimeout(() => {
    stream.push({ type: "start", partial: output });
    if (!requestedFormula) {
      requestedFormula = true;
      const toolCall = {
        type: "toolCall" as const,
        id: toolCallId,
        name: "qni",
        arguments: {
          commands: [
            ["clear"],
            ["add", "H", "--qubit", "0", "--step", "0"],
            ["add", "X", "--control", "0", "--qubit", "1", "--step", "1"],
            ["run", "--latex"]
          ]
        }
      };
      output.content.push(toolCall);
      stream.push({ type: "toolcall_start", contentIndex: 0, partial: output });
      stream.push({ type: "toolcall_delta", contentIndex: 0, delta: JSON.stringify(toolCall.arguments), partial: output });
      stream.push({ type: "toolcall_end", contentIndex: 0, toolCall, partial: output });
      output.stopReason = "toolUse";
      stream.push({ type: "done", reason: "toolUse", message: output });
    } else {
      const text = "Bell 状態の LaTeX を qni ツールで実行しました。";
      output.content.push({ type: "text", text });
      stream.push({ type: "text_start", contentIndex: 0, partial: output });
      stream.push({ type: "text_delta", contentIndex: 0, delta: text, partial: output });
      stream.push({ type: "text_end", contentIndex: 0, content: text, partial: output });
      output.stopReason = "stop";
      stream.push({ type: "done", reason: "stop", message: output });
    }
    stream.end();
  }, 1_500);

  return stream;
}

export default function qniFormulaToolProvider(pi: ExtensionAPI): void {
  pi.registerProvider("qni-formula-fixture", {
    name: "qni formula tool fixture",
    baseUrl: "fixture://qni-formula",
    apiKey: "fixture",
    api: "qni-formula-fixture",
    models: [{
      id: "tool",
      name: "qni formula tool fixture",
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 4_096,
      maxTokens: 1_024
    }],
    streamSimple: streamFixture
  });
}
