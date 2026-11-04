import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path = require("node:path");
import { execFileSync } from "node:child_process";

import type { CommandHandlerContext } from "./dispatcher";
import {
  gradeBenchmarkSuite,
  type BenchmarkStatus,
  type BenchmarkSuiteGradingResult,
} from "./evaluation_runner";
import {
  convertNeutralCircuitJsonToQniSubmission,
  NeutralCircuitJsonSubmissionError,
} from "./evaluation_runner/neutral_circuit_json_submission";
import { BLIND_NEUTRAL_CIRCUIT_JSON_SUBMISSION_PROTOCOL } from "./research_submission_protocol";
import {
  buildResearchSolveTaskPrompts,
  type ResearchSolveTaskPrompt,
} from "./research_solve_prompt";
import {
  planResearchTrialDirectory,
  validateResearchTrialSlug,
  writeResearchTrialDirectory,
  type ResearchTrialPlan,
} from "./research_trial_writer";

export const RESEARCH_THINKING_LEVELS = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;
export type ResearchThinking = (typeof RESEARCH_THINKING_LEVELS)[number];

export interface ResearchSolveRequest {
  readonly benchmark: string;
  readonly claudeBridgeExtension?: string;
  readonly model: string;
  readonly provider?: string;
  readonly slug: string;
  readonly tasks: readonly string[];
  readonly thinking: ResearchThinking;
}

interface ResearchSolveArtifactPaths {
  readonly benchmark: string;
  readonly calls: string;
  readonly circuitJson: string;
  readonly prompt: string;
  readonly prompts: string;
  readonly response: string;
  readonly responses: string;
  readonly root: string;
  readonly submissions: string;
}

interface PiPreflight {
  readonly provider: string;
  readonly version: string;
}

// How each Pi process is started. The default runner keeps the historical Pi
// invocation; the Claude Bridge runner adds exactly one explicit extension and
// isolates the Claude Code child from the user's Claude Code settings.
interface PiRunner {
  readonly claudeBridge?: ClaudeBridgeRunner;
  readonly extensionArgs: readonly string[];
  readonly modelArgs: readonly string[];
  readonly provider?: string;
}

interface ClaudeBridgeRunner {
  readonly extension: string;
  readonly sourceDirectory: string;
  readonly sourceDirectorySha256: string;
}

interface PiUsage {
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly costTotalUsd: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

interface ResearchSolveCallRecord {
  readonly circuitJson: string | null;
  readonly cost: { readonly totalUsd: number };
  readonly error?: string;
  readonly finishReason: string | null;
  readonly model: string;
  readonly piVersion: string;
  readonly prompt: string;
  readonly provider: string;
  readonly response: string;
  readonly responseValidation: ResearchSolveResponseValidation;
  readonly submission: string;
  readonly submissionProtocol: typeof SUBMISSION_PROTOCOL;
  readonly task: string;
  readonly taskId: string;
  readonly thinking: ResearchThinking;
  readonly tokens: Omit<PiUsage, "costTotalUsd">;
}

interface ValidResearchSolveResponseValidation {
  readonly status: "valid";
}
interface InvalidResearchSolveResponseValidation {
  readonly error: string;
  readonly status: "invalid";
}
interface ExecutionErrorResearchSolveResponseValidation {
  readonly error: string;
  readonly status: "error";
}
type ResearchSolveResponseValidation =
  | ValidResearchSolveResponseValidation
  | InvalidResearchSolveResponseValidation
  | ExecutionErrorResearchSolveResponseValidation;

interface ResearchSolveTotals extends PiUsage {}

class ResearchSolveError extends Error {}

const SUBMISSION_PROTOCOL = BLIND_NEUTRAL_CIRCUIT_JSON_SUBMISSION_PROTOCOL;
const INVALID_NEUTRAL_CIRCUIT_JSON_SUBMISSION =
  "qni __invalid-neutral-circuit-json-submission__";
const PI_EXECUTION_ERROR_SUBMISSION = "qni __pi-execution-error__";
const PI_TIMEOUT_MS = 5 * 60 * 1000;
const PI_TASK_SETTINGS = {
  retry: { enabled: false, provider: { maxRetries: 0 } },
  transport: "sse",
  cacheWarming: "off",
  compaction: { enabled: false },
} as const;
const CLAUDE_BRIDGE_PROCESS_ENV = {
  CLAUDE_CODE_MAX_RETRIES: "0",
  CLAUDE_CODE_NO_MODEL_FALLBACK: "1",
  CLAUDE_CODE_DISABLE_MODEL_ACCESS_FALLBACK: "1",
  CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK: "1",
} as const;
const CLAUDE_BRIDGE_PROVIDER = "claude-bridge";
const CLAUDE_BRIDGE_CONFIG = { provider: { settingSources: [] } } as const;
const CLAUDE_BRIDGE_INVALID_CONFIG_PROBE = {
  provider: { settingSources: "qni-invalid-setting-sources-probe" },
} as const;
const CLAUDE_BRIDGE_SYSTEM_PROMPT =
  "claude_code-preset-with-appended-task-system-prompt";

export function solveResearchTrial(
  request: ResearchSolveRequest,
  context: CommandHandlerContext
): number {
  validateResearchTrialSlug(request.slug);
  const tasks = buildResearchSolveTaskPrompts({
    benchmarkDir: request.benchmark,
    context,
    taskIds: request.tasks,
  });
  const candidateRunner = piRunner(request, context);
  const preflight = preflightPi({
    context,
    model: request.model,
    runner: candidateRunner,
  });
  const runner: PiRunner = {
    ...candidateRunner,
    provider: preflight.provider,
    modelArgs: ["--provider", preflight.provider, "--model", request.model],
  };
  const plan = planResearchSolveTrialDirectory(request, context);
  const artifacts = createResearchSolveArtifacts();
  let retainArtifacts = false;

  try {
    prepareSelectedBenchmark(artifacts.benchmark, tasks);
    const calls = runResearchSolveCalls({
      artifacts,
      context,
      preflight,
      request,
      runner,
      tasks,
    });
    const executionError = calls.find(
      (call) => call.responseValidation.status === "error"
    );
    const attemptedTasks = tasks.slice(0, calls.length);
    writeResearchSolveSuitePrompt({
      artifacts,
      request,
      tasks: attemptedTasks,
    });
    writeResearchSolveSuiteResponse({ artifacts, calls, request });
    writeJsonFile(artifacts.calls, {
      schemaVersion: 2,
      submissionProtocol: SUBMISSION_PROTOCOL,
      taskSelection: attemptedTasks.map((task) => task.taskId),
      taskSelectionMode: executionError
        ? "selected"
        : request.tasks.length === 0
          ? "full"
          : "selected",
      ...(executionError
        ? {
            executionStatus: "aborted",
            plannedTaskSelection: tasks.map((task) => task.taskId),
          }
        : {}),
      calls,
    });
    if (executionError) {
      retainArtifacts = true;
      process.stderr.write(
        `${executionError.error}\nPartial research solve artifacts: ${artifacts.root}\n`
      );
      return 3;
    }

    const graded = gradeBenchmarkSuite(
      {
        benchmarkDir: artifacts.benchmark,
        solutionsDir: artifacts.submissions,
      },
      context
    );
    const result = solveGradingResult({ calls, result: graded, tasks });
    const totals = researchSolveTotals(calls);

    writeResearchTrialDirectory({
      benchmark: request.benchmark,
      collaborator: qualifiedModel(request),
      extraInputPaths: {
        prompts: artifacts.prompts,
        responses: artifacts.responses,
        circuitJson: artifacts.circuitJson,
        calls: artifacts.calls,
      },
      inputPaths: {
        prompt: artifacts.prompt,
        response: artifacts.response,
        submissions: artifacts.submissions,
      },
      metadata: researchSolveMetadata({
        preflight,
        request,
        result,
        runner,
        tasks,
        totals,
        calls,
      }),
      plan,
      result,
      summary: researchSolveSummary({ preflight, request, result, totals }),
    });
    process.stdout.write(`Recorded research trial: ${plan.relativePath}\n`);
    return result.exitCode;
  } finally {
    if (!retainArtifacts)
      rmSync(artifacts.root, { force: true, recursive: true });
  }
}

function piRunner(
  request: ResearchSolveRequest,
  context: CommandHandlerContext
): PiRunner {
  const modelArgs = request.provider
    ? ["--provider", request.provider, "--model", request.model]
    : ["--model", request.model];
  if (request.claudeBridgeExtension === undefined) {
    return {
      extensionArgs: ["--no-extensions"],
      modelArgs,
      ...(request.provider ? { provider: request.provider } : {}),
    };
  }
  if (request.provider !== CLAUDE_BRIDGE_PROVIDER) {
    throw new ResearchSolveError(
      `--claude-bridge-extension requires --provider ${CLAUDE_BRIDGE_PROVIDER}`
    );
  }
  const resolved = path.resolve(context.cwd, request.claudeBridgeExtension);
  if (!existsSync(resolved) || !statSync(resolved).isFile()) {
    throw new ResearchSolveError(
      `Claude Bridge extension file does not exist: ${request.claudeBridgeExtension}`
    );
  }
  const extension = realpathSync(resolved);
  const sourceDirectory = path.dirname(extension);
  return {
    claudeBridge: {
      extension,
      sourceDirectory,
      sourceDirectorySha256: directorySha256(sourceDirectory),
    },
    extensionArgs: ["--no-extensions", "-e", extension],
    modelArgs,
    provider: CLAUDE_BRIDGE_PROVIDER,
  };
}

function preflightPi(options: {
  readonly context: CommandHandlerContext;
  readonly model: string;
  readonly runner: PiRunner;
}): PiPreflight {
  const { context, model, runner } = options;
  const version = runPiPreflight(["--version"], context)
    .trim()
    .replace(/^pi\s+/u, "");

  if (runner.claudeBridge) {
    // Pi's auth check reports extension providers as invalid; the bridge
    // authenticates through Claude Code. Instead prove the loaded bridge
    // honours provider.settingSources: it must register the model with the
    // isolation config and refuse an invalid one, or isolation could be lost
    // silently by a bridge that ignores the option.
    if (
      !claudeBridgeListsModel({
        config: CLAUDE_BRIDGE_CONFIG,
        context,
        model,
        runner,
      })
    ) {
      throw new ResearchSolveError(
        `Pi model is not available: ${runner.provider}/${model}`
      );
    }
    if (
      claudeBridgeListsModel({
        config: CLAUDE_BRIDGE_INVALID_CONFIG_PROBE,
        context,
        model,
        runner,
      })
    ) {
      throw new ResearchSolveError(
        "Claude Bridge extension does not validate provider.settingSources; refusing to run without Claude Code setting isolation"
      );
    }
    return { provider: CLAUDE_BRIDGE_PROVIDER, version };
  }

  const modelList = runPiPreflight(
    [
      "--offline",
      ...runner.extensionArgs,
      "--list-models",
      runner.provider ? `${runner.provider}/${model}` : model,
    ],
    context
  );
  const matching = modelListRows(modelList).find(
    (columns) =>
      columns[1] === model &&
      (runner.provider === undefined || columns[0] === runner.provider)
  );

  if (!matching) {
    throw new ResearchSolveError(
      `Pi model is not available: ${runner.provider ? `${runner.provider}/` : ""}${model}`
    );
  }

  const authText = runPiPreflight(
    ["auth", "check", ...runner.modelArgs, "--json"],
    context
  );
  let auth: unknown;
  try {
    auth = JSON.parse(authText) as unknown;
  } catch {
    throw new ResearchSolveError(
      `Pi auth check returned invalid JSON for model: ${model}`
    );
  }
  if (!isRecord(auth) || auth.status !== "ready") {
    throw new ResearchSolveError(
      `Pi authentication is not ready for model: ${model}`
    );
  }

  return {
    provider:
      runner.provider ??
      (typeof auth.provider === "string"
        ? auth.provider
        : (matching[0] ?? "unknown")),
    version,
  };
}

function claudeBridgeListsModel(options: {
  readonly config: unknown;
  readonly context: CommandHandlerContext;
  readonly model: string;
  readonly runner: PiRunner;
}): boolean {
  const cwd = mkdtempSync(path.join(tmpdir(), "qni-pi-preflight-"));
  try {
    writeJsonFile(path.join(cwd, ".pi", "claude-bridge.json"), options.config);
    const modelList = runPiPreflight(
      [
        "--offline",
        ...options.runner.extensionArgs,
        "--list-models",
        `${CLAUDE_BRIDGE_PROVIDER}/${options.model}`,
      ],
      options.context,
      cwd
    );
    return modelListRows(modelList).some(
      (columns) =>
        columns[0] === CLAUDE_BRIDGE_PROVIDER && columns[1] === options.model
    );
  } finally {
    rmSync(cwd, { force: true, recursive: true });
  }
}

function modelListRows(modelList: string): string[][] {
  return modelList
    .trim()
    .split(/\r?\n/u)
    .slice(1)
    .map((line) => line.trim().split(/\s+/u));
}

function runPiPreflight(
  args: readonly string[],
  context: CommandHandlerContext,
  cwd: string = context.cwd
): string {
  try {
    return execFileSync("pi", [...args], {
      cwd,
      encoding: "utf8",
      env: { ...context.env, PI_OFFLINE: "1" },
      timeout: 30_000,
    });
  } catch (error) {
    throw new ResearchSolveError(`Pi preflight failed: ${errorMessage(error)}`);
  }
}

function directorySha256(directory: string): string {
  const hash = createHash("sha256");
  const visit = (relative: string): void => {
    for (const entry of readdirSync(path.join(directory, relative), {
      withFileTypes: true,
    }).sort((left, right) => left.name.localeCompare(right.name))) {
      const entryPath = path.join(relative, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (entry.isFile())
        hash.update(
          `${entryPath}\0${createHash("sha256")
            .update(readFileSync(path.join(directory, entryPath)))
            .digest("hex")}\n`
        );
    }
  };
  visit("");
  return hash.digest("hex");
}

function qualifiedModel(request: ResearchSolveRequest): string {
  return request.provider
    ? `${request.provider}/${request.model}`
    : request.model;
}

function planResearchSolveTrialDirectory(
  request: ResearchSolveRequest,
  context: CommandHandlerContext
): ResearchTrialPlan {
  return planResearchTrialDirectory({
    cwd: context.cwd,
    destinationConflictHint:
      "Choose a different --slug and run qni research solve again.",
    slug: request.slug,
  });
}

function createResearchSolveArtifacts(): ResearchSolveArtifactPaths {
  const root = mkdtempSync(path.join(tmpdir(), "qni-research-solve-"));
  const directories = [
    "benchmark",
    "circuit-json",
    "prompts",
    "responses",
    "submissions",
  ];
  for (const directory of directories)
    mkdirSync(path.join(root, directory), { recursive: true });
  return {
    root,
    benchmark: path.join(root, "benchmark"),
    calls: path.join(root, "calls.json"),
    circuitJson: path.join(root, "circuit-json"),
    prompt: path.join(root, "prompt.md"),
    prompts: path.join(root, "prompts"),
    response: path.join(root, "response.md"),
    responses: path.join(root, "responses"),
    submissions: path.join(root, "submissions"),
  };
}

function prepareSelectedBenchmark(
  benchmarkDir: string,
  tasks: readonly ResearchSolveTaskPrompt[]
): void {
  for (const task of tasks) {
    const destination = path.join(benchmarkDir, task.relativeTaskFile);
    mkdirSync(path.dirname(destination), { recursive: true });
    cpSync(task.taskPath, destination);
  }
}

function runResearchSolveCalls(options: {
  readonly artifacts: ResearchSolveArtifactPaths;
  readonly context: CommandHandlerContext;
  readonly preflight: PiPreflight;
  readonly request: ResearchSolveRequest;
  readonly runner: PiRunner;
  readonly tasks: readonly ResearchSolveTaskPrompt[];
}): ResearchSolveCallRecord[] {
  const calls: ResearchSolveCallRecord[] = [];
  for (const task of options.tasks) {
    const call = runResearchSolveCall({ ...options, task });
    calls.push(call);
    if (call.responseValidation.status === "error") break;
  }
  return calls;
}

function runResearchSolveCall(options: {
  readonly artifacts: ResearchSolveArtifactPaths;
  readonly context: CommandHandlerContext;
  readonly preflight: PiPreflight;
  readonly request: ResearchSolveRequest;
  readonly runner: PiRunner;
  readonly task: ResearchSolveTaskPrompt;
}): ResearchSolveCallRecord {
  const task = options.task;
  const promptPath = path.join(options.artifacts.root, task.relativePromptPath);
  const responsePath = path.join(
    options.artifacts.root,
    task.relativeResponsePath
  );
  const circuitJsonPath = path.join(
    options.artifacts.root,
    task.relativeCircuitJsonPath
  );
  const submissionPath = path.join(
    options.artifacts.root,
    task.relativeSubmissionPath
  );
  writeTextFile(promptPath, task.promptText);

  let completion: PiCompletion;
  try {
    completion = callPi({
      context: options.context,
      runner: options.runner,
      model: options.request.model,
      systemPrompt: task.systemPrompt,
      thinking: options.request.thinking,
      userPrompt: task.userPrompt,
    });
  } catch (error) {
    const message = errorMessage(error);
    writeTextFile(responsePath, "");
    writeTextFile(submissionPath, PI_EXECUTION_ERROR_SUBMISSION);
    return callRecord({
      options,
      responseValidation: { status: "error", error: message },
      circuitJson: null,
      completion: emptyCompletion(options.preflight, options.request.model),
      error: message,
    });
  }

  writeTextFile(responsePath, completion.content);

  const submission = neutralCircuitJsonSubmission({
    availableGates: task.availableGates,
    rawResponse: completion.content,
  });
  if (submission.kind === "valid") {
    writeTextFile(circuitJsonPath, submission.circuitJson);
    writeTextFile(submissionPath, submission.qniSubmission.trimEnd());
  } else {
    writeTextFile(submissionPath, INVALID_NEUTRAL_CIRCUIT_JSON_SUBMISSION);
  }

  return callRecord({
    options,
    completion,
    circuitJson:
      submission.kind === "valid" ? task.relativeCircuitJsonPath : null,
    responseValidation:
      submission.kind === "valid"
        ? { status: "valid" }
        : { status: "invalid", error: submission.error },
  });
}

interface PiCompletion {
  readonly content: string;
  readonly finishReason: string | null;
  readonly model: string;
  readonly provider: string;
  readonly usage: PiUsage;
}

function callPi(options: {
  readonly context: CommandHandlerContext;
  readonly runner: PiRunner;
  readonly model: string;
  readonly systemPrompt: string;
  readonly thinking: ResearchThinking;
  readonly userPrompt: string;
}): PiCompletion {
  const cwd = mkdtempSync(path.join(tmpdir(), "qni-pi-task-"));
  try {
    writeJsonFile(path.join(cwd, ".pi", "settings.json"), PI_TASK_SETTINGS);
    if (options.runner.claudeBridge)
      writeJsonFile(
        path.join(cwd, ".pi", "claude-bridge.json"),
        CLAUDE_BRIDGE_CONFIG
      );
    let output: string;
    try {
      output = execFileSync(
        "pi",
        [
          "--mode",
          "json",
          "--approve",
          "--offline",
          ...options.runner.modelArgs,
          "--thinking",
          options.thinking,
          "--no-session",
          "--no-tools",
          "--no-context-files",
          "--no-skills",
          ...options.runner.extensionArgs,
          "--no-prompt-templates",
          "--system-prompt",
          options.systemPrompt,
          "--",
          options.userPrompt,
        ],
        {
          cwd,
          encoding: "utf8",
          env: {
            ...options.context.env,
            ...(options.runner.claudeBridge ? CLAUDE_BRIDGE_PROCESS_ENV : {}),
          },
          maxBuffer: 20 * 1024 * 1024,
          timeout: PI_TIMEOUT_MS,
        }
      );
    } catch (error) {
      const timeoutMinutes = PI_TIMEOUT_MS / 60_000;
      const message = isExecTimeout(error)
        ? `Pi task timed out after ${timeoutMinutes} minutes`
        : "Pi task failed";
      throw new ResearchSolveError(message);
    }
    return parsePiCompletion(output, options.runner.provider, options.model);
  } finally {
    rmSync(cwd, { force: true, recursive: true });
  }
}

function parsePiCompletion(
  jsonl: string,
  provider: string | undefined,
  model: string
): PiCompletion {
  const events = jsonl
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as unknown;
      } catch {
        throw new ResearchSolveError("Pi returned invalid JSONL");
      }
    });
  const event = [...events]
    .reverse()
    .find(
      (item) =>
        isRecord(item) &&
        item.type === "message_end" &&
        isRecord(item.message) &&
        item.message.role === "assistant"
    );
  if (!isRecord(event) || !isRecord(event.message))
    throw new ResearchSolveError("Pi returned no final assistant message");
  const message = event.message;
  if (message.model !== model)
    throw new ResearchSolveError(
      `Pi responded with a different model: requested ${model}, received ${String(message.model)}`
    );
  if (message.provider !== provider)
    throw new ResearchSolveError(
      `Pi responded with a different provider: requested ${provider}, received ${String(message.provider)}`
    );
  if (message.stopReason === "error" || message.stopReason === "aborted")
    throw new ResearchSolveError(
      `Pi execution ${message.stopReason}: ${typeof message.errorMessage === "string" ? message.errorMessage : "No error detail"}`
    );
  const content = Array.isArray(message.content)
    ? message.content
        .filter(isRecord)
        .filter((item) => item.type === "text" && typeof item.text === "string")
        .map((item) => String(item.text))
        .join("")
    : "";
  if (content.trim().length === 0)
    throw new ResearchSolveError("Pi returned an empty final answer");
  const usage = requiredRecord(
    message.usage,
    "Pi final message is missing usage"
  );
  const cost = requiredRecord(
    usage.cost,
    "Pi final message is missing usage.cost"
  );
  return {
    content,
    finishReason:
      typeof message.stopReason === "string" ? message.stopReason : null,
    provider: requiredString(
      message.provider,
      "Pi final message is missing provider"
    ),
    model: requiredString(message.model, "Pi final message is missing model"),
    usage: {
      inputTokens: requiredNonnegativeInteger(
        usage.input,
        "Pi usage.input must be a non-negative integer"
      ),
      outputTokens: requiredNonnegativeInteger(
        usage.output,
        "Pi usage.output must be a non-negative integer"
      ),
      cacheReadTokens: requiredNonnegativeInteger(
        usage.cacheRead,
        "Pi usage.cacheRead must be a non-negative integer"
      ),
      cacheWriteTokens: requiredNonnegativeInteger(
        usage.cacheWrite,
        "Pi usage.cacheWrite must be a non-negative integer"
      ),
      totalTokens: requiredNonnegativeInteger(
        usage.totalTokens,
        "Pi usage.totalTokens must be a non-negative integer"
      ),
      costTotalUsd: requiredNonnegativeNumber(
        cost.total,
        "Pi usage.cost.total must be a non-negative number"
      ),
    },
  };
}

function callRecord(input: {
  readonly circuitJson: string | null;
  readonly completion: PiCompletion;
  readonly error?: string;
  readonly options: {
    readonly preflight: PiPreflight;
    readonly request: ResearchSolveRequest;
    readonly task: ResearchSolveTaskPrompt;
  };
  readonly responseValidation: ResearchSolveResponseValidation;
}): ResearchSolveCallRecord {
  const { completion, options, responseValidation } = input;
  return {
    taskId: options.task.taskId,
    task: options.task.taskFile,
    prompt: options.task.relativePromptPath,
    response: options.task.relativeResponsePath,
    circuitJson: input.circuitJson,
    submission: options.task.relativeSubmissionPath,
    submissionProtocol: SUBMISSION_PROTOCOL,
    responseValidation,
    provider: completion.provider,
    model: completion.model,
    piVersion: options.preflight.version,
    thinking: options.request.thinking,
    finishReason: completion.finishReason,
    tokens: {
      inputTokens: completion.usage.inputTokens,
      outputTokens: completion.usage.outputTokens,
      cacheReadTokens: completion.usage.cacheReadTokens,
      cacheWriteTokens: completion.usage.cacheWriteTokens,
      totalTokens: completion.usage.totalTokens,
    },
    cost: { totalUsd: completion.usage.costTotalUsd },
    ...(input.error ? { error: input.error } : {}),
  };
}

function emptyCompletion(preflight: PiPreflight, model: string): PiCompletion {
  return {
    content: "",
    finishReason: null,
    model,
    provider: preflight.provider,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 0,
      costTotalUsd: 0,
    },
  };
}

function neutralCircuitJsonSubmission(options: {
  readonly availableGates: readonly string[];
  readonly rawResponse: string;
}):
  | {
      readonly circuitJson: string;
      readonly kind: "valid";
      readonly qniSubmission: string;
    }
  | { readonly error: string; readonly kind: "invalid" } {
  try {
    const qniSubmission = convertNeutralCircuitJsonToQniSubmission({
      availableGates: options.availableGates,
      submissionText: options.rawResponse,
    });
    return {
      circuitJson: `${JSON.stringify(JSON.parse(options.rawResponse) as unknown, null, 2)}\n`,
      kind: "valid",
      qniSubmission,
    };
  } catch (error) {
    if (
      error instanceof NeutralCircuitJsonSubmissionError ||
      error instanceof SyntaxError
    )
      return { error: error.message, kind: "invalid" };
    throw error;
  }
}

function solveGradingResult(options: {
  readonly calls: readonly ResearchSolveCallRecord[];
  readonly result: BenchmarkSuiteGradingResult;
  readonly tasks: readonly ResearchSolveTaskPrompt[];
}): BenchmarkSuiteGradingResult {
  const taskById = new Map(options.tasks.map((task) => [task.taskId, task]));
  const callById = new Map(options.calls.map((call) => [call.taskId, call]));
  const results = options.result.results.map((item) => {
    const task = item.taskId ? taskById.get(item.taskId) : undefined;
    const call = item.taskId ? callById.get(item.taskId) : undefined;
    const base = {
      ...item,
      task: task?.taskFile ?? item.task,
      submission: task?.relativeSubmissionPath ?? item.submission,
    };
    return call?.responseValidation.status === "error"
      ? {
          ...base,
          status: "error" as const,
          exitCode: 3,
          checks: [],
          error: call.error ?? call.responseValidation.error,
        }
      : base;
  });
  const summary = {
    total: results.length,
    passed: results.filter((item) => item.status === "passed").length,
    failed: results.filter((item) => item.status === "failed").length,
    disallowed: results.filter((item) => item.status === "disallowed").length,
    error: results.filter((item) => item.status === "error").length,
  };
  const status: BenchmarkStatus =
    summary.error > 0
      ? "error"
      : summary.disallowed > 0
        ? "disallowed"
        : summary.failed > 0
          ? "failed"
          : "passed";
  return {
    status,
    exitCode:
      status === "passed"
        ? 0
        : status === "failed"
          ? 1
          : status === "disallowed"
            ? 2
            : 3,
    summary,
    results,
  };
}

function writeResearchSolveSuitePrompt(options: {
  readonly artifacts: ResearchSolveArtifactPaths;
  readonly request: ResearchSolveRequest;
  readonly tasks: readonly ResearchSolveTaskPrompt[];
}): void {
  writeTextFile(
    options.artifacts.prompt,
    [
      "# qni research solve prompt",
      "",
      `- model: ${options.request.model}`,
      `- thinking: ${options.request.thinking}`,
      `- benchmark: ${options.request.benchmark}`,
      `- tasks: ${options.tasks.length}`,
      "- prompt view: neutral-benchmark-task",
      `- submission protocol: ${SUBMISSION_PROTOCOL}`,
      "",
      "## Per-task prompts",
      "",
      ...options.tasks.map(
        (task) => `- ${task.taskId}: ./${task.relativePromptPath}`
      ),
      "",
    ].join("\n")
  );
}

function writeResearchSolveSuiteResponse(options: {
  readonly artifacts: ResearchSolveArtifactPaths;
  readonly calls: readonly ResearchSolveCallRecord[];
  readonly request: ResearchSolveRequest;
}): void {
  writeTextFile(
    options.artifacts.response,
    [
      "# qni research solve response",
      "",
      `- model: ${options.request.model}`,
      `- thinking: ${options.request.thinking}`,
      `- benchmark: ${options.request.benchmark}`,
      `- calls: ${options.calls.length}`,
      "",
      "## Per-task responses and submissions",
      "",
      ...options.calls.map(
        (call) =>
          `- ${call.taskId}: ./${call.response}${call.circuitJson ? ` -> ./${call.circuitJson}` : ` -> ${call.responseValidation.status}`} -> ./${call.submission}`
      ),
      "",
    ].join("\n")
  );
}

function researchSolveMetadata(options: {
  readonly calls: readonly ResearchSolveCallRecord[];
  readonly preflight: PiPreflight;
  readonly request: ResearchSolveRequest;
  readonly result: BenchmarkSuiteGradingResult;
  readonly runner: PiRunner;
  readonly tasks: readonly ResearchSolveTaskPrompt[];
  readonly totals: ResearchSolveTotals;
}): Record<string, unknown> {
  const provider =
    options.runner.provider ??
    options.calls.find((call) => call.provider)?.provider ??
    options.preflight.provider;
  const claudeBridge = options.runner.claudeBridge;
  return {
    submissionProtocol: SUBMISSION_PROTOCOL,
    taskSelection: options.tasks.map((task) => task.taskId),
    taskSelectionMode: options.request.tasks.length === 0 ? "full" : "selected",
    model: { id: options.request.model, provider },
    generation: { thinking: options.request.thinking },
    pi: { version: options.preflight.version },
    harness: {
      name: "qni-cli",
      command: "qni research solve",
      runner: claudeBridge ? "pi-claude-bridge" : "pi",
      ...(claudeBridge
        ? {
            claudeBridge: {
              extension: claudeBridge.extension,
              sourceDirectorySha256: claudeBridge.sourceDirectorySha256,
              settingSources: CLAUDE_BRIDGE_CONFIG.provider.settingSources,
              systemPrompt: CLAUDE_BRIDGE_SYSTEM_PROMPT,
            },
          }
        : {}),
      benchmarkRunner: "qni benchmark run-all",
      piTaskSettings: PI_TASK_SETTINGS,
      projectApproval: "self-created-empty-task-directory-only",
      offline: true,
      ...(claudeBridge
        ? { claudeBridgeProcessEnv: CLAUDE_BRIDGE_PROCESS_ENV }
        : {}),
      promptView: "neutral-benchmark-task",
      submissionExtraction: "strict-neutral-circuit-json-conversion",
      submissionProtocol: SUBMISSION_PROTOCOL,
    },
    tokens: {
      inputTokens: options.totals.inputTokens,
      outputTokens: options.totals.outputTokens,
      cacheReadTokens: options.totals.cacheReadTokens,
      cacheWriteTokens: options.totals.cacheWriteTokens,
      totalTokens: options.totals.totalTokens,
      source: "pi_usage",
    },
    cost: {
      totalUsd: options.totals.costTotalUsd,
      perProblemUsd:
        options.result.summary.total === 0
          ? null
          : options.totals.costTotalUsd / options.result.summary.total,
      source: "pi_usage",
    },
    calls: "calls.json",
  };
}

function researchSolveSummary(options: {
  readonly preflight: PiPreflight;
  readonly request: ResearchSolveRequest;
  readonly result: BenchmarkSuiteGradingResult;
  readonly totals: ResearchSolveTotals;
}) {
  return {
    model: `${qualifiedModel(options.request)} (${options.request.thinking}, pi ${options.preflight.version})`,
    tokens: {
      inputTokens: options.totals.inputTokens,
      outputTokens: options.totals.outputTokens,
      totalTokens: options.totals.totalTokens,
    },
    cost: {
      totalUsd: options.totals.costTotalUsd,
      perProblemUsd:
        options.result.summary.total === 0
          ? null
          : options.totals.costTotalUsd / options.result.summary.total,
    },
  };
}

function researchSolveTotals(
  calls: readonly ResearchSolveCallRecord[]
): ResearchSolveTotals {
  return calls.reduce(
    (totals, call) => ({
      inputTokens: totals.inputTokens + call.tokens.inputTokens,
      outputTokens: totals.outputTokens + call.tokens.outputTokens,
      cacheReadTokens: totals.cacheReadTokens + call.tokens.cacheReadTokens,
      cacheWriteTokens: totals.cacheWriteTokens + call.tokens.cacheWriteTokens,
      totalTokens: totals.totalTokens + call.tokens.totalTokens,
      costTotalUsd: totals.costTotalUsd + call.cost.totalUsd,
    }),
    {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 0,
      costTotalUsd: 0,
    }
  );
}

function writeTextFile(filePath: string, content: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}
function writeJsonFile(filePath: string, value: unknown): void {
  writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
function requiredRecord(
  value: unknown,
  message: string
): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) throw new ResearchSolveError(message);
  return value;
}
function requiredString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new ResearchSolveError(message);
  return value;
}
function requiredNonnegativeInteger(value: unknown, message: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0)
    throw new ResearchSolveError(message);
  return value;
}
function requiredNonnegativeNumber(value: unknown, message: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    throw new ResearchSolveError(message);
  return value;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isExecTimeout(error: unknown): boolean {
  if (!isRecord(error)) return false;
  return (
    error.signal === "SIGTERM" ||
    error.code === "ETIMEDOUT" ||
    error.errno === "ETIMEDOUT"
  );
}
function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).trimEnd();
}
