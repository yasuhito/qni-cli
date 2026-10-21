import { resolve } from "node:path";

import { Resvg } from "@resvg/resvg-js";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent" with {
  "resolution-mode": "import",
};

import { quantumMacros } from "./quantum-macros";
import {
  formatBatchFailure,
  formatCommandOutput,
  formatQniExitError,
  truncateQniOutput,
  validateQniToolParams,
  type QniExecResult,
  type QniToolDetails,
  type QniToolParams,
} from "./qni-tool";
import { QniRuntime } from "./runtime";
import { QniWorkdirs } from "./workdir";

const { Type } = require("typebox");
const { Container, Image, Text } = require("@earendil-works/pi-tui") as {
  Container: new () => {
    addChild(component: {
      render(width: number): string[];
      invalidate(): void;
    }): void;
    render(width: number): string[];
    invalidate(): void;
  };
  Image: new (
    base64Data: string,
    mimeType: string,
    theme: { fallbackColor: (text: string) => string },
    options?: { maxWidthCells?: number; maxHeightCells?: number }
  ) => { render(width: number): string[]; invalidate(): void };
  Text: new (
    text: string,
    paddingX?: number,
    paddingY?: number
  ) => {
    render(width: number): string[];
    invalidate(): void;
  };
};

const qniExecutable = resolve(__dirname, "../bin/qni.js");

type FormulaModule = {
  registerFormula: (pi: ExtensionAPI, macros: typeof quantumMacros) => void;
  getFormulaPath: () => "image" | "text";
  createFormulaPng: (
    latex: string,
    availableWidth: number
  ) => { data: Buffer } | undefined;
};

async function circuitSvgFor(
  args: readonly string[],
  executeCommand: (args: string[]) => Promise<QniExecResult>
): Promise<string | undefined> {
  if (args.length !== 1 || args[0] !== "view") return undefined;
  const result = await executeCommand(["export", "--svg"]);
  return result.killed || result.code !== 0 ? undefined : result.stdout;
}

function formulaModule(): FormulaModule {
  return require("pi-formula") as FormulaModule;
}

function callIncludesView(params: QniToolParams): boolean {
  if (params.args?.[0] === "view") return true;
  return params.commands?.some((command) => command[0] === "view") ?? false;
}

function expandedCallBody(params: QniToolParams): string {
  return Object.entries(params)
    .filter((entry) => entry[1] !== undefined)
    .map(([key, value]) => {
      const text =
        typeof value === "string"
          ? value
          : (JSON.stringify(value, null, 2) ?? String(value));
      return ` ${key}: ${text.replaceAll("\r", "").split("\n").join("\n  ")}`;
    })
    .join("\n");
}

export default function qniToolsExtension(pi: ExtensionAPI): void {
  const formula = formulaModule();
  formula.registerFormula(pi, quantumMacros);
  const qniWorkdirs = new QniWorkdirs((customType, data) =>
    pi.appendEntry(customType, data)
  );

  pi.on("session_start", (event, ctx) => {
    qniWorkdirs.restore(ctx.sessionManager.getBranch(), event.reason);
  });
  pi.on("session_shutdown", (event) => {
    if (event.reason !== "reload") qniWorkdirs.cleanup();
  });

  pi.registerTool({
    name: "qni",
    label: "Qni",
    description:
      'qni-cli をシェルを介さず実行する。依存するコマンド列は commands にまとめる。最初の失敗で止まり、成功分の変更は残るため、修正後は残りだけを呼び直す。workdir を省略するとセッション専用の一時作業場所を使う。利用者が選んだ場所には Pi の作業場所からの相対パスを指定する。引数に ["--help"] を渡すと使い方を確認できる。',
    parameters: Type.Object({
      args: Type.Optional(Type.Array(Type.String())),
      commands: Type.Optional(Type.Array(Type.Array(Type.String()))),
      workdir: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId, rawParams, signal, _onUpdate, ctx) {
      const params = rawParams as QniToolParams;
      validateQniToolParams(params);
      const workdir = qniWorkdirs.resolve(ctx.cwd, params.workdir);
      return qniWorkdirs.run(workdir, async () => {
        const executeCommand = async (args: string[]): Promise<QniExecResult> =>
          pi.exec(
            QniRuntime.executable(process.versions, process.execPath),
            [qniExecutable, ...args],
            { cwd: workdir, signal }
          );

        if (params.args) {
          const result = await executeCommand(params.args);
          if (result.killed) throw new Error("qni was cancelled");
          if (result.code !== 0) throw new Error(formatQniExitError(result));
          const output = await truncateQniOutput(result.stdout);
          const circuitSvg = await circuitSvgFor(params.args, executeCommand);
          return {
            content: [{ type: "text" as const, text: output.text }],
            details: {
              ...(params.args.includes("--latex") && !output.truncated
                ? { latex: result.stdout }
                : {}),
              ...(circuitSvg === undefined ? {} : { circuitSvg }),
              workdir,
            },
          };
        }

        const content: Array<{ type: "text"; text: string }> = [];
        const commandDetails: Array<{ args: string[]; latex?: string }> = [];
        for (const [index, args] of params.commands!.entries()) {
          const result = await executeCommand(args);
          if (result.killed) throw new Error("qni was cancelled");
          if (result.code !== 0) {
            throw new Error(
              formatBatchFailure(
                content.map((item) => item.text),
                args,
                result,
                index,
                params.commands!.length
              )
            );
          }
          const output = await formatCommandOutput(args, result.stdout);
          content.push({ type: "text", text: output.text });
          const circuitSvg = await circuitSvgFor(args, executeCommand);
          commandDetails.push({
            args,
            ...(args.includes("--latex") && !output.truncated
              ? { latex: result.stdout }
              : {}),
            ...(circuitSvg === undefined ? {} : { circuitSvg }),
          });
        }
        return { content, details: { workdir, commands: commandDetails } };
      });
    },
    renderCall(args, theme, context) {
      const params = args as QniToolParams;
      if (
        !context.expanded &&
        callIncludesView(params) &&
        !context.isPartial &&
        !context.isError
      )
        return new Text("", 0, 0);
      const title = theme.fg("toolTitle", theme.bold("qni"));
      if (!context.expanded) return new Text(title, 0, 0);
      const body = expandedCallBody(params);
      return new Text(
        body === "" ? title : `${title}\n${theme.fg("muted", body)}`,
        0,
        0
      );
    },
    renderResult(result, { expanded }, theme) {
      const details = result.details as QniToolDetails | undefined;
      const imageForLatex = (latex: string) => {
        if (formula.getFormulaPath() !== "image") return undefined;
        const maxWidthCells = expanded ? 120 : 60;
        const image = formula.createFormulaPng(latex.trim(), maxWidthCells);
        if (!image) return undefined;
        return new Image(
          image.data.toString("base64"),
          "image/png",
          { fallbackColor: (fallback) => theme.fg("muted", fallback) },
          { maxWidthCells, maxHeightCells: 4 }
        );
      };
      const imageForCircuit = (svg: string) => {
        if (formula.getFormulaPath() !== "image") return undefined;
        try {
          const png = new Resvg(svg).render().asPng();
          const maxWidthCells = expanded ? 120 : 60;
          return new Image(
            png.toString("base64"),
            "image/png",
            { fallbackColor: (fallback) => theme.fg("muted", fallback) },
            { maxWidthCells, maxHeightCells: 30 }
          );
        } catch {
          return undefined;
        }
      };

      const imagePath = formula.getFormulaPath() === "image";
      const hideUnrenderedLatex = (latex: string | undefined, image: unknown) =>
        !expanded && image === undefined && latex !== undefined && imagePath;

      let body;
      if (details && "commands" in details) {
        const texts = result.content.filter((item) => item.type === "text");
        const circuitOnly =
          !expanded &&
          details.commands.some((command) => command.args[0] === "view");
        if (circuitOnly) {
          const images = [];
          for (const command of details.commands) {
            if (command.args[0] !== "view" || command.circuitSvg === undefined)
              continue;
            const image = imageForCircuit(command.circuitSvg);
            if (image) images.push(image);
          }
          if (images.length === 1) {
            body = images[0];
          } else if (images.length > 1) {
            const batch = new Container();
            for (const image of images) batch.addChild(image);
            body = batch;
          } else {
            const batch = new Container();
            texts.forEach((item, index) => {
              if (details.commands[index]?.args[0] !== "view") return;
              batch.addChild(new Text(item.text.trimEnd(), 0, 0));
            });
            body = batch;
          }
        } else {
          const batch = new Container();
          texts.forEach((item, index) => {
            const command = details.commands[index];
            const image = command?.circuitSvg
              ? imageForCircuit(command.circuitSvg)
              : command?.latex
                ? imageForLatex(command.latex)
                : undefined;
            if (hideUnrenderedLatex(command?.latex, image)) return;
            if (image) {
              batch.addChild(new Text(item.text.split("\n", 1)[0]!, 0, 0));
              batch.addChild(image);
            } else batch.addChild(new Text(item.text.trimEnd(), 0, 0));
          });
          body = batch;
        }
      } else {
        const text =
          result.content.find((item) => item.type === "text")?.text ?? "";
        body = details?.circuitSvg
          ? imageForCircuit(details.circuitSvg)
          : details?.latex
            ? imageForLatex(details.latex)
            : undefined;
        if (hideUnrenderedLatex(details?.latex, body))
          body = new Text("", 0, 0);
        body ??= new Text(text.trimEnd(), 0, 0);
      }
      if (!expanded || !details) return body;
      const container = new Container();
      container.addChild(
        new Text(theme.fg("muted", `workdir: ${details.workdir}`), 0, 0)
      );
      container.addChild(body);
      return container;
    },
  });
}
