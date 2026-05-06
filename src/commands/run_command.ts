import { currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { runRubyFallbackSync } from '../process/process_compatibility';
import { Simulator } from '../simulator';

export function runRunCommand(argv: string[], context: CommandHandlerContext): number {
  if (!typeScriptRun(argv)) {
    return runRubyFallbackSync({
      argv,
      cwd: context.cwd,
      env: context.env,
      projectRoot: context.projectRoot
    }).exitStatus ?? 1;
  }

  try {
    process.stdout.write(`${new Simulator(currentCircuitFile(context.cwd).load()).renderStateVector()}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function typeScriptRun(argv: readonly string[]): boolean {
  return argv.length === 1 && argv[0] === 'run';
}
