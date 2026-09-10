import { resolve } from "node:path";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent" with { "resolution-mode": "import" };

import { quantumMacros } from "./quantum-macros";
import {
  formatBatchFailure,
  formatCommandOutput,
  formatQniExitError,
  truncateQniOutput,
  validateQniToolParams,
  type QniExecResult,
  type QniToolDetails,
  type QniToolParams
} from "./qni-tool";
import { QniWorkdirs } from "./workdir";

const { Type } = require("typebox");
const { Container, Image, Text } = require("@earendil-works/pi-tui") as {
  Container: new () => {
    addChild(component: { render(width: number): string[]; invalidate(): void }): void;
    render(width: number): string[];
    invalidate(): void;
  };
  Image: new (
    base64Data: string,
    mimeType: string,
    theme: { fallbackColor: (text: string) => string },
    options?: { maxWidthCells?: number; maxHeightCells?: number }
  ) => { render(width: number): string[]; invalidate(): void };
  Text: new (text: string, paddingX?: number, paddingY?: number) => {
    render(width: number): string[];
    invalidate(): void;
  };
};

const qniExecutable = resolve(__dirname, "../bin/qni.js");

type FormulaModule = {
  registerFormula: (pi: ExtensionAPI, macros: typeof quantumMacros) => void;
  getFormulaPath: () => "image" | "text";
  createFormulaPng: (latex: string, availableWidth: number) => { data: Buffer } | undefined;
};

function formulaModule(): FormulaModule {
  return require("pi-formula") as FormulaModule;
}

export default function qniToolsExtension(pi: ExtensionAPI): void {
  const formula = formulaModule();
  formula.registerFormula(pi, quantumMacros);
  const qniWorkdirs = new QniWorkdirs((customType, data) => pi.appendEntry(customType, data));

  pi.on("session_start", (event, ctx) => {
    qniWorkdirs.restore(ctx.sessionManager.getBranch(), event.reason);
  });
  pi.on("session_shutdown", (event) => {
    if (event.reason !== "reload") qniWorkdirs.cleanup();
  });

  pi.registerTool({
    name: "qni",
    label: "Qni",
    description: "qni-cli をシェルを介さず実行する。依存するコマンド列は commands にまとめる。最初の失敗で止まり、成功分の変更は残るため、修正後は残りだけを呼び直す。workdir を省略するとセッション専用の一時作業場所を使う。利用者が選んだ場所には Pi の作業場所からの相対パスを指定する。引数に [\"--help\"] を渡すと使い方を確認できる。",
    parameters: Type.Object({
      args: Type.Optional(Type.Array(Type.String())),
      commands: Type.Optional(Type.Array(Type.Array(Type.String()))),
      workdir: Type.Optional(Type.String())
    }),
    async execute(_toolCallId, rawParams, signal, _onUpdate, ctx) {
      const params = rawParams as QniToolParams;
      validateQniToolParams(params);
      const workdir = qniWorkdirs.resolve(ctx.cwd, params.workdir);
      return qniWorkdirs.run(workdir, async () => {
        const executeCommand = async (args: string[]): Promise<QniExecResult> =>
          pi.exec(process.execPath, [qniExecutable, ...args], { cwd: workdir, signal });

        if (params.args) {
          const result = await executeCommand(params.args);
          if (result.killed) throw new Error("qni was cancelled");
          if (result.code !== 0) throw new Error(formatQniExitError(result));
          const output = await truncateQniOutput(result.stdout);
          return {
            content: [{ type: "text" as const, text: output.text }],
            details: {
              ...(params.args.includes("--latex") && !output.truncated ? { latex: result.stdout } : {}),
              workdir
            }
          };
        }

        const content: Array<{ type: "text"; text: string }> = [];
        const commandDetails: Array<{ args: string[]; latex?: string }> = [];
        for (const [index, args] of params.commands!.entries()) {
          const result = await executeCommand(args);
          if (result.killed) throw new Error("qni was cancelled");
          if (result.code !== 0) {
            throw new Error(formatBatchFailure(content.map((item) => item.text), args, result, index, params.commands!.length));
          }
          const output = await formatCommandOutput(args, result.stdout);
          content.push({ type: "text", text: output.text });
          commandDetails.push({ args, ...(args.includes("--latex") && !output.truncated ? { latex: result.stdout } : {}) });
        }
        return { content, details: { workdir, commands: commandDetails } };
      });
    },
    renderResult(result, { expanded }, theme) {
      const details = result.details as QniToolDetails | undefined;
      const imageForLatex = (latex: string) => {
        if (formula.getFormulaPath() !== "image") return undefined;
        const maxWidthCells = expanded ? 120 : 60;
        const image = formula.createFormulaPng(latex.trim(), maxWidthCells);
        if (!image) return undefined;
        return new Image(image.data.toString("base64"), "image/png", { fallbackColor: (fallback) => theme.fg("muted", fallback) }, { maxWidthCells, maxHeightCells: 4 });
      };

      let body;
      if (details && "commands" in details) {
        const batch = new Container();
        const texts = result.content.filter((item) => item.type === "text");
        texts.forEach((item, index) => {
          const command = details.commands[index];
          const image = command?.latex ? imageForLatex(command.latex) : undefined;
          if (image) {
            batch.addChild(new Text(item.text.split("\n", 1)[0]!, 0, 0));
            batch.addChild(image);
          } else batch.addChild(new Text(item.text.trimEnd(), 0, 0));
        });
        body = batch;
      } else {
        const text = result.content.find((item) => item.type === "text")?.text ?? "";
        body = details?.latex ? imageForLatex(details.latex) : undefined;
        body ??= new Text(text.trimEnd(), 0, 0);
      }
      if (!expanded || !details) return body;
      const container = new Container();
      container.addChild(new Text(theme.fg("muted", `workdir: ${details.workdir}`), 0, 0));
      container.addChild(body);
      return container;
    }
  });
}
