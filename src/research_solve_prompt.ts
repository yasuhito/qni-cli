import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path = require('node:path');

import type { CommandHandlerContext } from './dispatcher';
import { loadBenchmarkTask } from './evaluation_runner/benchmark_task';
import type { OpenAICompatibleMessage } from './openai_compatible_provider';

export interface ResearchSolveTaskPrompt {
  readonly messages: readonly OpenAICompatibleMessage[];
  readonly availableGates: readonly string[];
  readonly promptText: string;
  readonly relativeCircuitJsonPath: string;
  readonly relativePromptPath: string;
  readonly relativeResponsePath: string;
  readonly relativeSubmissionPath: string;
  readonly relativeTaskFile: string;
  readonly taskFile: string;
  readonly taskId: string;
  readonly taskPath: string;
  readonly title: string;
}

class ResearchSolvePromptError extends Error {}

export function buildResearchSolveTaskPrompts(options: {
  readonly benchmarkDir: string;
  readonly context: CommandHandlerContext;
}): ResearchSolveTaskPrompt[] {
  const benchmarkDirPath = resolveInputPath(options.benchmarkDir, options.context);
  const relativeTaskFiles = markdownFilesInDirectory(benchmarkDirPath);

  if (relativeTaskFiles.length === 0) {
    throw new ResearchSolvePromptError(`benchmark directory contains no task files: ${options.benchmarkDir}`);
  }

  return relativeTaskFiles.map((relativeTaskFile) => {
    const taskPath = path.join(benchmarkDirPath, relativeTaskFile);
    const task = loadBenchmarkTask(taskPath);
    const taskBody = benchmarkTaskBody(readFileSync(taskPath, 'utf8'));
    const relativeTaskFilePosix = toPosixPath(relativeTaskFile);
    const relativeSubmissionFile = relativeTaskFilePosix.replace(/\.md$/u, '.qni');
    const relativeCircuitJsonFile = relativeTaskFilePosix.replace(/\.md$/u, '.json');
    const messages = promptMessages({
      availableGates: task.availableGates,
      taskBody
    });

    return {
      availableGates: task.availableGates,
      messages,
      promptText: savedPromptText(messages),
      relativeCircuitJsonPath: toPosixPath(path.join('circuit-json', relativeCircuitJsonFile)),
      relativePromptPath: toPosixPath(path.join('prompts', relativeTaskFilePosix)),
      relativeResponsePath: toPosixPath(path.join('responses', relativeTaskFilePosix)),
      relativeSubmissionPath: toPosixPath(path.join('submissions', relativeSubmissionFile)),
      relativeTaskFile: relativeTaskFilePosix,
      taskFile: toPosixPath(path.join(options.benchmarkDir, relativeTaskFilePosix)),
      taskId: task.id,
      taskPath,
      title: task.title
    };
  });
}

function promptMessages(options: {
  readonly availableGates: readonly string[];
  readonly taskBody: string;
}): readonly OpenAICompatibleMessage[] {
  const responseRule = '有効な JSON だけを返す。Markdown で囲まない。説明を書かない。';

  return [
    {
      role: 'system',
      content: [
        'あなたは量子回路課題に解答するAIです。',
        '利用可能ゲート一覧と課題本文だけを根拠に、中立回路 JSON プロトコル blind-neutral-circuit-json-v1 の提出を作成してください。',
        responseRule
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        '# neutral circuit task',
        '',
        '## available_gates',
        '',
        ...options.availableGates.map((gate) => `- ${gate}`),
        '',
        '## response_format',
        '',
        responseRule,
        'トップレベルは object で、キーは operations だけです。',
        'operations は配列です。配列の順序が回路の操作順序です。',
        '各 operation は gate と targets を持ち、必要な場合だけ controls と angle を持ちます。',
        'gate は available_gates にある名前を使います。',
        'targets と controls は0始まりの非負整数配列です。',
        'angle は pi を使った記号式の文字列です。数値ラジアンは使いません。',
        '',
        '## neutral_task_body',
        '',
        options.taskBody
      ].join('\n')
    }
  ];
}

function savedPromptText(messages: readonly OpenAICompatibleMessage[]): string {
  return messages
    .map((message) => [
      `# ${message.role === 'system' ? 'System' : 'User'} message`,
      '',
      message.content,
      ''
    ].join('\n'))
    .join('\n');
}

function benchmarkTaskBody(markdown: string): string {
  const match = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)(?<body>[\s\S]*)$/u.exec(markdown);

  if (!match?.groups) {
    throw new ResearchSolvePromptError('benchmark task file must start with YAML frontmatter');
  }

  return match.groups.body.trim();
}

function markdownFilesInDirectory(dir: string): string[] {
  if (!existsSync(dir)) {
    throw new ResearchSolvePromptError(`benchmark directory does not exist: ${dir}`);
  }

  if (!statSync(dir).isDirectory()) {
    throw new ResearchSolvePromptError(`benchmark path is not a directory: ${dir}`);
  }

  return markdownFilesInDirectoryEntries(dir, '').sort();
}

function markdownFilesInDirectoryEntries(root: string, relativeDir: string): string[] {
  const dir = path.join(root, relativeDir);
  const entries = readdirSync(dir, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  const files: string[] = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...markdownFilesInDirectoryEntries(root, relativePath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relativePath);
    }
  }

  return files;
}

function resolveInputPath(filePath: string, context: CommandHandlerContext): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  const cwdPath = path.resolve(context.cwd, filePath);

  if (existsSync(cwdPath)) {
    return cwdPath;
  }

  return path.resolve(context.projectRoot, filePath);
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}
