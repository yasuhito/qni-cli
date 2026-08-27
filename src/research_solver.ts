import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path = require('node:path');
import { execFileSync } from 'node:child_process';

import type { CommandHandlerContext } from './dispatcher';
import { gradeBenchmarkSuite, type BenchmarkStatus, type BenchmarkSuiteGradingResult } from './evaluation_runner';
import {
  convertNeutralCircuitJsonToQniSubmission,
  NeutralCircuitJsonSubmissionError
} from './evaluation_runner/neutral_circuit_json_submission';
import { BLIND_NEUTRAL_CIRCUIT_JSON_SUBMISSION_PROTOCOL } from './research_submission_protocol';
import { buildResearchSolveTaskPrompts, type ResearchSolveTaskPrompt } from './research_solve_prompt';
import {
  planResearchTrialDirectory,
  validateResearchTrialSlug,
  writeResearchTrialDirectory,
  type ResearchTrialPlan
} from './research_trial_writer';

export const RESEARCH_THINKING_LEVELS = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
export type ResearchThinking = (typeof RESEARCH_THINKING_LEVELS)[number];

export interface ResearchSolveRequest {
  readonly benchmark: string;
  readonly model: string;
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
  readonly tokens: Omit<PiUsage, 'costTotalUsd'>;
}

interface ValidResearchSolveResponseValidation { readonly status: 'valid' }
interface InvalidResearchSolveResponseValidation { readonly error: string; readonly status: 'invalid' }
interface ExecutionErrorResearchSolveResponseValidation { readonly error: string; readonly status: 'error' }
type ResearchSolveResponseValidation = ValidResearchSolveResponseValidation | InvalidResearchSolveResponseValidation | ExecutionErrorResearchSolveResponseValidation;

interface ResearchSolveTotals extends PiUsage {}

class ResearchSolveError extends Error {}

const SUBMISSION_PROTOCOL = BLIND_NEUTRAL_CIRCUIT_JSON_SUBMISSION_PROTOCOL;
const INVALID_NEUTRAL_CIRCUIT_JSON_SUBMISSION = 'qni __invalid-neutral-circuit-json-submission__';
const PI_EXECUTION_ERROR_SUBMISSION = 'qni __pi-execution-error__';
const PI_TIMEOUT_MS = 5 * 60 * 1000;

export function solveResearchTrial(request: ResearchSolveRequest, context: CommandHandlerContext): number {
  validateResearchTrialSlug(request.slug);
  const tasks = buildResearchSolveTaskPrompts({ benchmarkDir: request.benchmark, context, taskIds: request.tasks });
  const preflight = preflightPi(request.model, context);
  const plan = planResearchSolveTrialDirectory(request, context);
  const artifacts = createResearchSolveArtifacts();

  try {
    prepareSelectedBenchmark(artifacts.benchmark, tasks);
    const calls = runResearchSolveCalls({ artifacts, context, preflight, request, tasks });
    writeResearchSolveSuitePrompt({ artifacts, request, tasks });
    writeResearchSolveSuiteResponse({ artifacts, calls, request });
    writeJsonFile(artifacts.calls, {
      schemaVersion: 2,
      submissionProtocol: SUBMISSION_PROTOCOL,
      taskSelection: tasks.map((task) => task.taskId),
      taskSelectionMode: request.tasks.length === 0 ? 'full' : 'selected',
      calls
    });

    const graded = gradeBenchmarkSuite({ benchmarkDir: artifacts.benchmark, solutionsDir: artifacts.submissions }, context);
    const result = solveGradingResult({ calls, result: graded, tasks });
    const totals = researchSolveTotals(calls);

    writeResearchTrialDirectory({
      benchmark: request.benchmark,
      collaborator: request.model,
      extraInputPaths: {
        prompts: artifacts.prompts,
        responses: artifacts.responses,
        circuitJson: artifacts.circuitJson,
        calls: artifacts.calls
      },
      inputPaths: {
        prompt: artifacts.prompt,
        response: artifacts.response,
        submissions: artifacts.submissions
      },
      metadata: researchSolveMetadata({ preflight, request, result, tasks, totals, calls }),
      plan,
      result,
      summary: researchSolveSummary({ preflight, request, result, totals })
    });
    process.stdout.write(`Recorded research trial: ${plan.relativePath}\n`);
    return result.exitCode;
  } finally {
    rmSync(artifacts.root, { force: true, recursive: true });
  }
}

function preflightPi(model: string, context: CommandHandlerContext): PiPreflight {
  const version = runPiPreflight(['--version'], context).trim().replace(/^pi\s+/u, '');
  const modelList = runPiPreflight(['--list-models', model], context);
  const rows = modelList.trim().split(/\r?\n/u).slice(1).map((line) => line.trim().split(/\s+/u));
  const matching = rows.find((columns) => columns[1] === model);

  if (!matching) {
    throw new ResearchSolveError(`Pi model is not available: ${model}`);
  }

  const authText = runPiPreflight(['auth', 'check', '--model', model, '--json'], context);
  let auth: unknown;
  try { auth = JSON.parse(authText) as unknown; } catch { throw new ResearchSolveError(`Pi auth check returned invalid JSON for model: ${model}`); }
  if (!isRecord(auth) || auth.status !== 'ready') {
    throw new ResearchSolveError(`Pi authentication is not ready for model: ${model}`);
  }

  return { provider: typeof auth.provider === 'string' ? auth.provider : matching[0] ?? 'unknown', version };
}

function runPiPreflight(args: readonly string[], context: CommandHandlerContext): string {
  try {
    return execFileSync('pi', [...args], { cwd: context.cwd, encoding: 'utf8', env: context.env, timeout: 30_000 });
  } catch (error) {
    throw new ResearchSolveError(`Pi preflight failed: ${errorMessage(error)}`);
  }
}

function planResearchSolveTrialDirectory(request: ResearchSolveRequest, context: CommandHandlerContext): ResearchTrialPlan {
  return planResearchTrialDirectory({
    cwd: context.cwd,
    destinationConflictHint: 'Choose a different --slug and run qni research solve again.',
    slug: request.slug
  });
}

function createResearchSolveArtifacts(): ResearchSolveArtifactPaths {
  const root = mkdtempSync(path.join(tmpdir(), 'qni-research-solve-'));
  const directories = ['benchmark', 'circuit-json', 'prompts', 'responses', 'submissions'];
  for (const directory of directories) mkdirSync(path.join(root, directory), { recursive: true });
  return {
    root,
    benchmark: path.join(root, 'benchmark'),
    calls: path.join(root, 'calls.json'),
    circuitJson: path.join(root, 'circuit-json'),
    prompt: path.join(root, 'prompt.md'),
    prompts: path.join(root, 'prompts'),
    response: path.join(root, 'response.md'),
    responses: path.join(root, 'responses'),
    submissions: path.join(root, 'submissions')
  };
}

function prepareSelectedBenchmark(benchmarkDir: string, tasks: readonly ResearchSolveTaskPrompt[]): void {
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
  readonly tasks: readonly ResearchSolveTaskPrompt[];
}): ResearchSolveCallRecord[] {
  return options.tasks.map((task) => runResearchSolveCall({ ...options, task }));
}

function runResearchSolveCall(options: {
  readonly artifacts: ResearchSolveArtifactPaths;
  readonly context: CommandHandlerContext;
  readonly preflight: PiPreflight;
  readonly request: ResearchSolveRequest;
  readonly task: ResearchSolveTaskPrompt;
}): ResearchSolveCallRecord {
  const task = options.task;
  const promptPath = path.join(options.artifacts.root, task.relativePromptPath);
  const responsePath = path.join(options.artifacts.root, task.relativeResponsePath);
  const circuitJsonPath = path.join(options.artifacts.root, task.relativeCircuitJsonPath);
  const submissionPath = path.join(options.artifacts.root, task.relativeSubmissionPath);
  writeTextFile(promptPath, task.promptText);

  let completion: PiCompletion;
  try {
    completion = callPi({ context: options.context, model: options.request.model, systemPrompt: task.systemPrompt, thinking: options.request.thinking, userPrompt: task.userPrompt });
  } catch (error) {
    const message = errorMessage(error);
    writeTextFile(responsePath, '');
    writeTextFile(submissionPath, PI_EXECUTION_ERROR_SUBMISSION);
    return callRecord({ options, responseValidation: { status: 'error', error: message }, circuitJson: null, completion: emptyCompletion(options.preflight, options.request.model), error: message });
  }

  writeTextFile(responsePath, completion.content);

  if (completion.model !== options.request.model) {
    const message = `Pi responded with a different model: requested ${options.request.model}, received ${completion.model}`;
    writeTextFile(submissionPath, PI_EXECUTION_ERROR_SUBMISSION);
    return callRecord({
      options,
      completion,
      circuitJson: null,
      error: message,
      responseValidation: { status: 'error', error: message }
    });
  }

  const submission = neutralCircuitJsonSubmission({ availableGates: task.availableGates, rawResponse: completion.content });
  if (submission.kind === 'valid') {
    writeTextFile(circuitJsonPath, submission.circuitJson);
    writeTextFile(submissionPath, submission.qniSubmission.trimEnd());
  } else {
    writeTextFile(submissionPath, INVALID_NEUTRAL_CIRCUIT_JSON_SUBMISSION);
  }

  return callRecord({
    options,
    completion,
    circuitJson: submission.kind === 'valid' ? task.relativeCircuitJsonPath : null,
    responseValidation: submission.kind === 'valid' ? { status: 'valid' } : { status: 'invalid', error: submission.error }
  });
}

interface PiCompletion {
  readonly content: string;
  readonly finishReason: string | null;
  readonly model: string;
  readonly provider: string;
  readonly usage: PiUsage;
}

function callPi(options: { readonly context: CommandHandlerContext; readonly model: string; readonly systemPrompt: string; readonly thinking: ResearchThinking; readonly userPrompt: string }): PiCompletion {
  const cwd = mkdtempSync(path.join(tmpdir(), 'qni-pi-task-'));
  try {
    const output = execFileSync('pi', [
      '--mode', 'json', '--model', options.model, '--thinking', options.thinking,
      '--no-session', '--no-tools', '--no-context-files', '--no-skills', '--no-extensions', '--no-prompt-templates',
      '--system-prompt', options.systemPrompt, '--', options.userPrompt
    ], { cwd, encoding: 'utf8', env: options.context.env, maxBuffer: 20 * 1024 * 1024, timeout: PI_TIMEOUT_MS });
    return parsePiCompletion(output);
  } catch (error) {
    const timeoutMinutes = PI_TIMEOUT_MS / 60_000;
    const message = isExecTimeout(error)
      ? `Pi task timed out after ${timeoutMinutes} minutes`
      : 'Pi task failed';
    throw new ResearchSolveError(message);
  } finally {
    rmSync(cwd, { force: true, recursive: true });
  }
}

function parsePiCompletion(jsonl: string): PiCompletion {
  const events = jsonl.split(/\r?\n/u).filter(Boolean).map((line) => {
    try { return JSON.parse(line) as unknown; } catch { throw new ResearchSolveError('Pi returned invalid JSONL'); }
  });
  const event = [...events].reverse().find((item) => isRecord(item) && item.type === 'message_end' && isRecord(item.message) && item.message.role === 'assistant');
  if (!isRecord(event) || !isRecord(event.message)) throw new ResearchSolveError('Pi returned no final assistant message');
  const message = event.message;
  const content = Array.isArray(message.content)
    ? message.content.filter(isRecord).filter((item) => item.type === 'text' && typeof item.text === 'string').map((item) => String(item.text)).join('')
    : '';
  if (content.trim().length === 0) throw new ResearchSolveError('Pi returned an empty final answer');
  const usage = requiredRecord(message.usage, 'Pi final message is missing usage');
  const cost = requiredRecord(usage.cost, 'Pi final message is missing usage.cost');
  return {
    content,
    finishReason: typeof message.stopReason === 'string' ? message.stopReason : null,
    provider: requiredString(message.provider, 'Pi final message is missing provider'),
    model: requiredString(message.model, 'Pi final message is missing model'),
    usage: {
      inputTokens: requiredNonnegativeInteger(usage.input, 'Pi usage.input must be a non-negative integer'),
      outputTokens: requiredNonnegativeInteger(usage.output, 'Pi usage.output must be a non-negative integer'),
      cacheReadTokens: requiredNonnegativeInteger(usage.cacheRead, 'Pi usage.cacheRead must be a non-negative integer'),
      cacheWriteTokens: requiredNonnegativeInteger(usage.cacheWrite, 'Pi usage.cacheWrite must be a non-negative integer'),
      totalTokens: requiredNonnegativeInteger(usage.totalTokens, 'Pi usage.totalTokens must be a non-negative integer'),
      costTotalUsd: requiredNonnegativeNumber(cost.total, 'Pi usage.cost.total must be a non-negative number')
    }
  };
}

function callRecord(input: {
  readonly circuitJson: string | null;
  readonly completion: PiCompletion;
  readonly error?: string;
  readonly options: { readonly preflight: PiPreflight; readonly request: ResearchSolveRequest; readonly task: ResearchSolveTaskPrompt };
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
      totalTokens: completion.usage.totalTokens
    },
    cost: { totalUsd: completion.usage.costTotalUsd },
    ...(input.error ? { error: input.error } : {})
  };
}

function emptyCompletion(preflight: PiPreflight, model: string): PiCompletion {
  return { content: '', finishReason: null, model, provider: preflight.provider, usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, totalTokens: 0, costTotalUsd: 0 } };
}

function neutralCircuitJsonSubmission(options: { readonly availableGates: readonly string[]; readonly rawResponse: string }):
  | { readonly circuitJson: string; readonly kind: 'valid'; readonly qniSubmission: string }
  | { readonly error: string; readonly kind: 'invalid' } {
  try {
    const qniSubmission = convertNeutralCircuitJsonToQniSubmission({ availableGates: options.availableGates, submissionText: options.rawResponse });
    return { circuitJson: `${JSON.stringify(JSON.parse(options.rawResponse) as unknown, null, 2)}\n`, kind: 'valid', qniSubmission };
  } catch (error) {
    if (error instanceof NeutralCircuitJsonSubmissionError || error instanceof SyntaxError) return { error: error.message, kind: 'invalid' };
    throw error;
  }
}

function solveGradingResult(options: { readonly calls: readonly ResearchSolveCallRecord[]; readonly result: BenchmarkSuiteGradingResult; readonly tasks: readonly ResearchSolveTaskPrompt[] }): BenchmarkSuiteGradingResult {
  const taskById = new Map(options.tasks.map((task) => [task.taskId, task]));
  const callById = new Map(options.calls.map((call) => [call.taskId, call]));
  const results = options.result.results.map((item) => {
    const task = item.taskId ? taskById.get(item.taskId) : undefined;
    const call = item.taskId ? callById.get(item.taskId) : undefined;
    const base = { ...item, task: task?.taskFile ?? item.task, submission: task?.relativeSubmissionPath ?? item.submission };
    return call?.responseValidation.status === 'error'
      ? { ...base, status: 'error' as const, exitCode: 3, checks: [], error: call.error ?? call.responseValidation.error }
      : base;
  });
  const summary = {
    total: results.length,
    passed: results.filter((item) => item.status === 'passed').length,
    failed: results.filter((item) => item.status === 'failed').length,
    disallowed: results.filter((item) => item.status === 'disallowed').length,
    error: results.filter((item) => item.status === 'error').length
  };
  const status: BenchmarkStatus = summary.error > 0 ? 'error' : summary.disallowed > 0 ? 'disallowed' : summary.failed > 0 ? 'failed' : 'passed';
  return { status, exitCode: status === 'passed' ? 0 : status === 'failed' ? 1 : status === 'disallowed' ? 2 : 3, summary, results };
}

function writeResearchSolveSuitePrompt(options: { readonly artifacts: ResearchSolveArtifactPaths; readonly request: ResearchSolveRequest; readonly tasks: readonly ResearchSolveTaskPrompt[] }): void {
  writeTextFile(options.artifacts.prompt, ['# qni research solve prompt', '', `- model: ${options.request.model}`, `- thinking: ${options.request.thinking}`, `- benchmark: ${options.request.benchmark}`, `- tasks: ${options.tasks.length}`, '- prompt view: neutral-benchmark-task', `- submission protocol: ${SUBMISSION_PROTOCOL}`, '', '## Per-task prompts', '', ...options.tasks.map((task) => `- ${task.taskId}: ./${task.relativePromptPath}`), ''].join('\n'));
}

function writeResearchSolveSuiteResponse(options: { readonly artifacts: ResearchSolveArtifactPaths; readonly calls: readonly ResearchSolveCallRecord[]; readonly request: ResearchSolveRequest }): void {
  writeTextFile(options.artifacts.response, ['# qni research solve response', '', `- model: ${options.request.model}`, `- thinking: ${options.request.thinking}`, `- benchmark: ${options.request.benchmark}`, `- calls: ${options.calls.length}`, '', '## Per-task responses and submissions', '', ...options.calls.map((call) => `- ${call.taskId}: ./${call.response}${call.circuitJson ? ` -> ./${call.circuitJson}` : ` -> ${call.responseValidation.status}`} -> ./${call.submission}`), ''].join('\n'));
}

function researchSolveMetadata(options: { readonly calls: readonly ResearchSolveCallRecord[]; readonly preflight: PiPreflight; readonly request: ResearchSolveRequest; readonly result: BenchmarkSuiteGradingResult; readonly tasks: readonly ResearchSolveTaskPrompt[]; readonly totals: ResearchSolveTotals }): Record<string, unknown> {
  const provider = options.calls.find((call) => call.provider)?.provider ?? options.preflight.provider;
  return {
    submissionProtocol: SUBMISSION_PROTOCOL,
    taskSelection: options.tasks.map((task) => task.taskId),
    taskSelectionMode: options.request.tasks.length === 0 ? 'full' : 'selected',
    model: { id: options.request.model, provider },
    generation: { thinking: options.request.thinking },
    pi: { version: options.preflight.version },
    harness: { name: 'qni-cli', command: 'qni research solve', runner: 'pi', benchmarkRunner: 'qni benchmark run-all', promptView: 'neutral-benchmark-task', submissionExtraction: 'strict-neutral-circuit-json-conversion', submissionProtocol: SUBMISSION_PROTOCOL },
    tokens: { inputTokens: options.totals.inputTokens, outputTokens: options.totals.outputTokens, cacheReadTokens: options.totals.cacheReadTokens, cacheWriteTokens: options.totals.cacheWriteTokens, totalTokens: options.totals.totalTokens, source: 'pi_usage' },
    cost: { totalUsd: options.totals.costTotalUsd, perProblemUsd: options.result.summary.total === 0 ? null : options.totals.costTotalUsd / options.result.summary.total, source: 'pi_usage' },
    calls: 'calls.json'
  };
}

function researchSolveSummary(options: { readonly preflight: PiPreflight; readonly request: ResearchSolveRequest; readonly result: BenchmarkSuiteGradingResult; readonly totals: ResearchSolveTotals }) {
  return { model: `${options.request.model} (${options.request.thinking}, pi ${options.preflight.version})`, tokens: { inputTokens: options.totals.inputTokens, outputTokens: options.totals.outputTokens, totalTokens: options.totals.totalTokens }, cost: { totalUsd: options.totals.costTotalUsd, perProblemUsd: options.result.summary.total === 0 ? null : options.totals.costTotalUsd / options.result.summary.total } };
}

function researchSolveTotals(calls: readonly ResearchSolveCallRecord[]): ResearchSolveTotals {
  return calls.reduce((totals, call) => ({ inputTokens: totals.inputTokens + call.tokens.inputTokens, outputTokens: totals.outputTokens + call.tokens.outputTokens, cacheReadTokens: totals.cacheReadTokens + call.tokens.cacheReadTokens, cacheWriteTokens: totals.cacheWriteTokens + call.tokens.cacheWriteTokens, totalTokens: totals.totalTokens + call.tokens.totalTokens, costTotalUsd: totals.costTotalUsd + call.cost.totalUsd }), { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, totalTokens: 0, costTotalUsd: 0 });
}

function writeTextFile(filePath: string, content: string): void { mkdirSync(path.dirname(filePath), { recursive: true }); writeFileSync(filePath, content); }
function writeJsonFile(filePath: string, value: unknown): void { writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`); }
function requiredRecord(value: unknown, message: string): Readonly<Record<string, unknown>> { if (!isRecord(value)) throw new ResearchSolveError(message); return value; }
function requiredString(value: unknown, message: string): string { if (typeof value !== 'string' || value.length === 0) throw new ResearchSolveError(message); return value; }
function requiredNonnegativeInteger(value: unknown, message: string): number { if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new ResearchSolveError(message); return value; }
function requiredNonnegativeNumber(value: unknown, message: string): number { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new ResearchSolveError(message); return value; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isExecTimeout(error: unknown): boolean {
  if (!isRecord(error)) return false;
  return error.signal === 'SIGTERM' || error.code === 'ETIMEDOUT' || error.errno === 'ETIMEDOUT';
}
function errorMessage(error: unknown): string { return (error instanceof Error ? error.message : String(error)).trimEnd(); }
