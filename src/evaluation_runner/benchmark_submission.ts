import { readFileSync } from 'node:fs';

import type { AllowedCommand } from './benchmark_task';
import { splitCommandLine } from '../qni_command_line';

export interface SubmissionCommand {
  readonly argv: string[];
  readonly lineNumber: number;
  readonly source: string;
}

export interface DisallowedSubmission {
  readonly command: SubmissionCommand;
}

export type BenchmarkSubmission = AllowedBenchmarkSubmission | DisallowedBenchmarkSubmission;

interface AllowedBenchmarkSubmission {
  readonly commands: readonly SubmissionCommand[];
  readonly kind: 'allowed';
}

interface DisallowedBenchmarkSubmission {
  readonly disallowedSubmission: DisallowedSubmission;
  readonly kind: 'disallowed';
}

class EvaluationRunnerSubmissionError extends Error {}

export function readBenchmarkSubmission(options: {
  readonly allowedCommands: readonly AllowedCommand[];
  readonly submissionPath: string;
}): BenchmarkSubmission {
  const commands = qniCommandsInSubmission(options.submissionPath);
  const disallowedSubmission = disallowedSubmissionCommand(commands, options.allowedCommands);

  if (disallowedSubmission) {
    return {
      disallowedSubmission,
      kind: 'disallowed'
    };
  }

  return {
    commands,
    kind: 'allowed'
  };
}

function qniCommandsInSubmission(submissionPath: string): SubmissionCommand[] {
  return readFileSync(submissionPath, 'utf8')
    .split(/\r?\n/u)
    .map((line, index) => ({ lineNumber: index + 1, source: line.trim() }))
    .filter((line) => line.source.length > 0)
    .map((line) => {
      const argv = splitCommandLine(line.source);

      if (argv[0] !== 'qni') {
        throw new EvaluationRunnerSubmissionError(`submission command must start with qni at line ${line.lineNumber}: ${line.source}`);
      }

      return {
        argv: argv.slice(1),
        lineNumber: line.lineNumber,
        source: line.source
      };
    });
}

function disallowedSubmissionCommand(
  commands: readonly SubmissionCommand[],
  allowedCommands: readonly AllowedCommand[]
): DisallowedSubmission | undefined {
  const command = commands.find((candidate) => !allowedCommands.some((allowed) => commandAllowed(candidate, allowed)));

  return command ? { command } : undefined;
}

function commandAllowed(command: SubmissionCommand, allowed: AllowedCommand): boolean {
  return allowed.argv.every((word, index) => command.argv[index] === word);
}
