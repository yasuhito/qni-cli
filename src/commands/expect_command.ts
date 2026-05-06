import { currentCircuitFile } from '../circuit_file';
import type { CommandHandlerContext } from '../dispatcher';
import { runRubyFallbackSync } from '../process/process_compatibility';
import { Simulator } from '../simulator';

export function runExpectCommand(argv: string[], context: CommandHandlerContext): number {
  if (!typeScriptExpect(argv)) {
    return runRubyFallbackSync({
      argv,
      cwd: context.cwd,
      env: context.env,
      projectRoot: context.projectRoot
    }).exitStatus ?? 1;
  }

  try {
    const pauliStrings = argv.slice(1).map((pauliString) => pauliString.toUpperCase());
    process.stdout.write(`${new Simulator(currentCircuitFile(context.cwd).load()).renderExpectationValues(pauliStrings)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function typeScriptExpect(argv: readonly string[]): boolean {
  return argv.length > 1 && argv[0] === 'expect' && argv.slice(1).every((arg) => !arg.startsWith('-'));
}
