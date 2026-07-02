import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path = require('node:path');

import type { CommandHandlerContext } from './dispatcher';
import { gradeBenchmarkSuite, type BenchmarkSuiteGradingResult } from './evaluation_runner';
import {
  createOpenAICompatibleChatCompletion,
  openAICompatibleGenerationOptions,
  type OpenAICompatibleGenerationOptions,
  type OpenAICompatibleUsage
} from './openai_compatible_provider';
import { loadResearchModelRegistration, resolveModelApiKey, type ResearchModelRegistration } from './research_models';
import { buildResearchSolveTaskPrompts, type ResearchSolveTaskPrompt } from './research_solve_prompt';
import {
  planResearchTrialDirectory,
  validateResearchTrialSlug,
  writeResearchTrialDirectory,
  type ResearchTrialPlan
} from './research_trial_writer';

export interface ResearchSolveRequest {
  readonly benchmark: string;
  readonly model: string;
  readonly slug: string;
}

interface ResearchSolveArtifactPaths {
  readonly calls: string;
  readonly prompt: string;
  readonly prompts: string;
  readonly response: string;
  readonly responses: string;
  readonly root: string;
  readonly submissions: string;
}

interface ResearchSolveCallRecord {
  readonly apiModel: string;
  readonly cost: {
    readonly totalUsd: number;
  };
  readonly finishReason: string | null;
  readonly prompt: string;
  readonly provider: 'openai-compatible';
  readonly response: string;
  readonly submission: string;
  readonly task: string;
  readonly taskId: string;
  readonly tokens: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly totalTokens: number;
  };
}

interface ResearchSolveTotals {
  readonly costTotalUsd: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

export function solveResearchTrial(request: ResearchSolveRequest, context: CommandHandlerContext): number {
  validateResearchTrialSlug(request.slug);
  const model = loadResearchModelRegistration({ context, modelId: request.model });
  const apiKey = resolveModelApiKey(model, context.env);
  const tasks = buildResearchSolveTaskPrompts({ benchmarkDir: request.benchmark, context });
  const plan = planResearchSolveTrialDirectory(request, context);
  const artifacts = createResearchSolveArtifacts();

  try {
    const generation = openAICompatibleGenerationOptions();
    const calls = runResearchSolveCalls({
      apiKey,
      artifacts,
      generation,
      model,
      tasks
    });
    writeResearchSolveSuitePrompt({ artifacts, model, request, tasks });
    writeResearchSolveSuiteResponse({ artifacts, calls, model, request });
    writeJsonFile(artifacts.calls, {
      schemaVersion: 1,
      calls
    });

    const result = solveGradingResult({
      result: gradeBenchmarkSuite({
        benchmarkDir: request.benchmark,
        solutionsDir: artifacts.submissions
      }, context),
      tasks
    });
    const totals = researchSolveTotals(calls);

    writeResearchTrialDirectory({
      benchmark: request.benchmark,
      collaborator: model.registryId,
      extraInputPaths: {
        prompts: artifacts.prompts,
        responses: artifacts.responses,
        calls: artifacts.calls
      },
      inputPaths: {
        prompt: artifacts.prompt,
        response: artifacts.response,
        submissions: artifacts.submissions
      },
      metadata: researchSolveMetadata({
        generation,
        model,
        result,
        totals
      }),
      plan,
      result,
      summary: researchSolveSummary({ model, result, totals })
    });
    process.stdout.write(`Recorded research trial: ${plan.relativePath}\n`);

    return result.exitCode;
  } finally {
    rmSync(artifacts.root, { force: true, recursive: true });
  }
}

function planResearchSolveTrialDirectory(
  request: ResearchSolveRequest,
  context: CommandHandlerContext
): ResearchTrialPlan {
  return planResearchTrialDirectory({
    cwd: context.cwd,
    destinationConflictHint: 'Choose a different --slug and run qni research solve again.',
    slug: request.slug
  });
}

function createResearchSolveArtifacts(): ResearchSolveArtifactPaths {
  const root = mkdtempSync(path.join(tmpdir(), 'qni-research-solve-'));
  const prompts = path.join(root, 'prompts');
  const responses = path.join(root, 'responses');
  const submissions = path.join(root, 'submissions');

  mkdirSync(prompts, { recursive: true });
  mkdirSync(responses, { recursive: true });
  mkdirSync(submissions, { recursive: true });

  return {
    root,
    calls: path.join(root, 'calls.json'),
    prompt: path.join(root, 'prompt.md'),
    prompts,
    response: path.join(root, 'response.md'),
    responses,
    submissions
  };
}

function runResearchSolveCalls(options: {
  readonly apiKey: string;
  readonly artifacts: ResearchSolveArtifactPaths;
  readonly generation: OpenAICompatibleGenerationOptions;
  readonly model: ResearchModelRegistration;
  readonly tasks: readonly ResearchSolveTaskPrompt[];
}): ResearchSolveCallRecord[] {
  return options.tasks.map((task) => {
    const promptPath = path.join(options.artifacts.root, task.relativePromptPath);
    const responsePath = path.join(options.artifacts.root, task.relativeResponsePath);
    const submissionPath = path.join(options.artifacts.root, task.relativeSubmissionPath);

    writeTextFile(promptPath, task.promptText);

    const completion = createOpenAICompatibleChatCompletion({
      apiKey: options.apiKey,
      apiModel: options.model.apiModel,
      baseUrl: options.model.baseUrl,
      generation: options.generation,
      messages: task.messages
    });
    const submission = completion.content.trim();

    writeTextFile(responsePath, submission);
    writeTextFile(submissionPath, submission);

    return {
      taskId: task.taskId,
      task: task.taskFile,
      prompt: task.relativePromptPath,
      response: task.relativeResponsePath,
      submission: task.relativeSubmissionPath,
      provider: options.model.provider,
      apiModel: options.model.apiModel,
      finishReason: completion.finishReason,
      tokens: usageRecord(completion.usage),
      cost: {
        totalUsd: callCostUsd(completion.usage, options.model)
      }
    };
  });
}

function solveGradingResult(options: {
  readonly result: BenchmarkSuiteGradingResult;
  readonly tasks: readonly ResearchSolveTaskPrompt[];
}): BenchmarkSuiteGradingResult {
  const submissionByTask = new Map(options.tasks.map((task) => [task.taskFile, task.relativeSubmissionPath]));

  return {
    ...options.result,
    results: options.result.results.map((item) => ({
      ...item,
      submission: submissionByTask.get(item.task) ?? item.submission
    }))
  };
}

function writeResearchSolveSuitePrompt(options: {
  readonly artifacts: ResearchSolveArtifactPaths;
  readonly model: ResearchModelRegistration;
  readonly request: ResearchSolveRequest;
  readonly tasks: readonly ResearchSolveTaskPrompt[];
}): void {
  writeTextFile(options.artifacts.prompt, [
    `# qni research solve prompt`,
    '',
    `- model: ${options.model.registryId}`,
    `- benchmark: ${options.request.benchmark}`,
    `- tasks: ${options.tasks.length}`,
    '- prompt view: sanitized-benchmark-task',
    '- submission extraction: strict-trimmed-response',
    '',
    '## Per-task prompts',
    '',
    ...options.tasks.map((task) => `- ${task.taskId}: ./${task.relativePromptPath}`),
    ''
  ].join('\n'));
}

function writeResearchSolveSuiteResponse(options: {
  readonly artifacts: ResearchSolveArtifactPaths;
  readonly calls: readonly ResearchSolveCallRecord[];
  readonly model: ResearchModelRegistration;
  readonly request: ResearchSolveRequest;
}): void {
  writeTextFile(options.artifacts.response, [
    '# qni research solve response',
    '',
    `- model: ${options.model.registryId}`,
    `- benchmark: ${options.request.benchmark}`,
    `- calls: ${options.calls.length}`,
    '',
    '## Per-task responses and submissions',
    '',
    ...options.calls.map((call) => `- ${call.taskId}: ./${call.response} -> ./${call.submission}`),
    ''
  ].join('\n'));
}

function researchSolveMetadata(options: {
  readonly generation: OpenAICompatibleGenerationOptions;
  readonly model: ResearchModelRegistration;
  readonly result: BenchmarkSuiteGradingResult;
  readonly totals: ResearchSolveTotals;
}): Record<string, unknown> {
  const scoreTotal = options.result.summary.total;

  return {
    model: {
      registryId: options.model.registryId,
      provider: options.model.provider,
      apiModel: options.model.apiModel
    },
    generation: options.generation,
    harness: {
      name: 'qni-cli',
      command: 'qni research solve',
      benchmarkRunner: 'qni benchmark run-all',
      promptView: 'sanitized-benchmark-task',
      submissionExtraction: 'strict-trimmed-response'
    },
    tokens: {
      inputTokens: options.totals.inputTokens,
      outputTokens: options.totals.outputTokens,
      totalTokens: options.totals.totalTokens,
      source: 'provider_usage'
    },
    cost: {
      totalUsd: options.totals.costTotalUsd,
      perProblemUsd: scoreTotal === 0 ? null : options.totals.costTotalUsd / scoreTotal,
      source: 'estimated_from_model_registry',
      inputCostPerMillionTokensUsd: options.model.inputCostPerMillionTokensUsd,
      outputCostPerMillionTokensUsd: options.model.outputCostPerMillionTokensUsd
    },
    calls: 'calls.json'
  };
}

function researchSolveSummary(options: {
  readonly model: ResearchModelRegistration;
  readonly result: BenchmarkSuiteGradingResult;
  readonly totals: ResearchSolveTotals;
}): {
  readonly cost: {
    readonly perProblemUsd: number | null;
    readonly totalUsd: number;
  };
  readonly model: string;
  readonly tokens: {
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly totalTokens: number;
  };
} {
  return {
    model: options.model.registryId,
    tokens: {
      inputTokens: options.totals.inputTokens,
      outputTokens: options.totals.outputTokens,
      totalTokens: options.totals.totalTokens
    },
    cost: {
      totalUsd: options.totals.costTotalUsd,
      perProblemUsd: options.result.summary.total === 0 ? null : options.totals.costTotalUsd / options.result.summary.total
    }
  };
}

function researchSolveTotals(calls: readonly ResearchSolveCallRecord[]): ResearchSolveTotals {
  return calls.reduce<ResearchSolveTotals>((totals, call) => ({
    inputTokens: totals.inputTokens + call.tokens.inputTokens,
    outputTokens: totals.outputTokens + call.tokens.outputTokens,
    totalTokens: totals.totalTokens + call.tokens.totalTokens,
    costTotalUsd: totals.costTotalUsd + call.cost.totalUsd
  }), {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    costTotalUsd: 0
  });
}

function usageRecord(usage: OpenAICompatibleUsage): ResearchSolveCallRecord['tokens'] {
  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens
  };
}

function callCostUsd(usage: OpenAICompatibleUsage, model: ResearchModelRegistration): number {
  return (
    usage.inputTokens * model.inputCostPerMillionTokensUsd +
    usage.outputTokens * model.outputCostPerMillionTokensUsd
  ) / 1_000_000;
}

function writeTextFile(filePath: string, content: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
}

function writeJsonFile(filePath: string, value: unknown): void {
  writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
