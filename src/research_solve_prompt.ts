import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path = require('node:path');

import type { CommandHandlerContext } from './dispatcher';
import { loadBenchmarkTask, type AllowedCommand } from './evaluation_runner/benchmark_task';
import type { OpenAICompatibleMessage } from './openai_compatible_provider';

export interface ResearchSolveTaskPrompt {
  readonly messages: readonly OpenAICompatibleMessage[];
  readonly promptText: string;
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
    const messages = promptMessages({
      allowedCommands: task.allowedCommands,
      taskBody,
      taskId: task.id,
      title: task.title
    });

    return {
      messages,
      promptText: savedPromptText(messages),
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
  readonly allowedCommands: readonly AllowedCommand[];
  readonly taskBody: string;
  readonly taskId: string;
  readonly title: string;
}): readonly OpenAICompatibleMessage[] {
  return [
    {
      role: 'system',
      content: [
        'あなたは qni-cli のベンチマーク課題に解答するAIです。',
        '課題本文と許可コマンドだけを使って、評価ランナーへ提出する `.qni` ファイルの本文を作成してください。',
        '検証用の内部情報は与えられていません。回答には検証用の内部情報を推測して書かないでください。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        '# ベンチマーク課題',
        '',
        `- id: ${options.taskId}`,
        `- title: ${options.title}`,
        '',
        '## 許可コマンド',
        '',
        ...options.allowedCommands.map((command) => `- ${command.source}`),
        '',
        '## 出力ルール',
        '',
        '- 回答は `.qni` 形式だけにしてください。',
        '- 1行に1つ、完全な `qni` コマンドを書いてください。',
        '- 説明文、Markdown のコードフェンス、箇条書き、余談は出力しないでください。',
        '- `qni run` や `qni expect` などの検証コマンドは書かないでください。',
        '- 使用してよいのは、上の許可コマンドで始まる `qni` コマンドだけです。',
        '- `--qubit` と `--step` は0始まりです。',
        '',
        '## 最小限の qni 書式',
        '',
        '```text',
        'qni add <gate> --qubit <index> --step <index>',
        'qni add <gate> --control <index>[,<index>...] --qubit <index>[,<index>...] --step <index>',
        'qni add P --angle <angle> --qubit <index> --step <index>',
        '```',
        '',
        '## 課題本文',
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
