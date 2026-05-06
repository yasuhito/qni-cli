import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { CircuitData } from './circuit_file';

export class SymbolicStateRendererError extends Error {}

export type SymbolicOutputFormat = 'latex' | 'text';

export interface SymbolicStateRenderOptions {
  readonly basis?: string;
  readonly circuit: CircuitData;
  readonly env?: NodeJS.ProcessEnv;
  readonly format?: SymbolicOutputFormat;
  readonly projectRoot: string;
}

interface HelperCommand {
  readonly args: readonly string[];
  readonly command: string;
}

interface ResolvedSymbolicStateRenderOptions extends SymbolicStateRenderOptions {
  readonly format: SymbolicOutputFormat;
}

const SETUP_MESSAGE = 'symbolic run requires SymPy runtime; run scripts/setup_symbolic_python.sh';

export function renderSymbolicStateVector(options: SymbolicStateRenderOptions): string {
  validateSymbolicBasis({ basis: options.basis, qubits: options.circuit.qubits });

  return renderWithHelpers({
    ...options,
    format: options.format ?? 'text'
  });
}

function validateSymbolicBasis(options: { basis?: string; qubits: number }): void {
  if ((options.basis === 'x' || options.basis === 'y') && options.qubits !== 1) {
    throw new SymbolicStateRendererError(
      `symbolic ${options.basis}-basis run currently supports only 1-qubit circuits`
    );
  }

  if (options.basis === 'bell' && options.qubits !== 2) {
    throw new SymbolicStateRendererError('symbolic bell-basis run currently supports only 2-qubit circuits');
  }
}

function renderWithHelpers(options: ResolvedSymbolicStateRenderOptions): string {
  for (const command of helperCommands(options)) {
    const output = renderWithHelper(command, options);

    if (output !== undefined) {
      return output;
    }
  }

  throw new SymbolicStateRendererError(SETUP_MESSAGE);
}

function helperCommands(options: ResolvedSymbolicStateRenderOptions): HelperCommand[] {
  const helperPath = path.join(options.projectRoot, 'libexec', 'qni_symbolic_run.py');
  const args = [helperPath, '--format', options.format];

  if (options.basis !== undefined) {
    args.push('--basis', options.basis);
  }

  return [
    {
      args,
      command: path.join(options.projectRoot, '.python-symbolic', 'bin', 'python')
    },
    {
      args,
      command: 'python3'
    },
    {
      args: ['run', '--quiet', '--with', 'sympy', 'python3', ...args],
      command: 'uv'
    }
  ];
}

function renderWithHelper(command: HelperCommand, options: ResolvedSymbolicStateRenderOptions): string | undefined {
  const result = spawnSync(command.command, [...command.args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ...options.env,
      UV_CACHE_DIR: path.join(tmpdir(), 'qni-cli-uv-cache')
    },
    input: JSON.stringify(options.circuit),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  if (result.error) {
    const error = result.error as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      return undefined;
    }

    if (error.code === 'EPIPE') {
      if (result.status === 0) {
        return result.stdout.trim();
      }

      if (retryableWithNextCommand(command.command, result.stderr)) {
        return undefined;
      }

      if (result.status !== null || result.stderr.trim() !== '') {
        throw new SymbolicStateRendererError(renderErrorMessage(result.stderr, result.status));
      }
    }

    throw new SymbolicStateRendererError(error.message);
  }

  if (result.status === 0) {
    return result.stdout.trim();
  }

  if (retryableWithNextCommand(command.command, result.stderr)) {
    return undefined;
  }

  throw new SymbolicStateRendererError(renderErrorMessage(result.stderr, result.status));
}

function retryableWithNextCommand(command: string, stderr: string): boolean {
  return (
    (command === 'uv' && stderr.includes('Failed to fetch:')) ||
    (command === 'python3' && stderr.includes("No module named 'sympy'"))
  );
}

function renderErrorMessage(stderr: string, status: number | null): string {
  const message = stderr.trim();
  return message === '' ? `symbolic renderer failed with exit status ${status ?? ''}` : message;
}
