import { currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { runRubyFallbackSync } from '../process/process_compatibility';
import { Simulator } from '../simulator';
import { renderSymbolicStateVector } from '../symbolic_state_renderer';

interface RunOptions {
  readonly basis?: string;
  readonly symbolic: boolean;
}

export function runRunCommand(argv: string[], context: CommandHandlerContext): number {
  const options = parseRunOptions(argv);

  if (!options) {
    return runRubyFallbackSync({
      argv,
      cwd: context.cwd,
      env: context.env,
      projectRoot: context.projectRoot
    }).exitStatus ?? 1;
  }

  try {
    const circuit = currentCircuitFile(context.cwd).load();
    if (options.basis !== undefined && !options.symbolic) {
      throw new Error('--basis requires --symbolic');
    }

    const output = options.symbolic
      ? renderSymbolicStateVector({
          basis: options.basis,
          circuit,
          env: context.env,
          projectRoot: context.projectRoot
        })
      : new Simulator(circuit).renderStateVector();

    process.stdout.write(`${output}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function parseRunOptions(argv: readonly string[]): RunOptions | undefined {
  if (argv[0] !== 'run') {
    return undefined;
  }

  const options: { basis?: string; symbolic: boolean } = { symbolic: false };
  let index = 1;

  while (index < argv.length) {
    const argument = argv[index];

    if (argument === '--symbolic') {
      options.symbolic = true;
      index += 1;
      continue;
    }

    if (argument === '--basis') {
      const basis = argv[index + 1];
      if (basis === undefined) {
        return undefined;
      }

      options.basis = basis;
      index += 2;
      continue;
    }

    if (argument.startsWith('--basis=')) {
      options.basis = argument.slice('--basis='.length);
      index += 1;
      continue;
    }

    return undefined;
  }

  return options;
}
