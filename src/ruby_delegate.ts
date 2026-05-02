import { runRubyFallbackSync } from './process/process_compatibility';

export interface RubyDelegateOptions {
  argv: string[];
  env: NodeJS.ProcessEnv;
  projectRoot: string;
}

export function delegateToRuby(options: RubyDelegateOptions): number {
  const result = runRubyFallbackSync({
    argv: options.argv,
    cwd: process.cwd(),
    env: options.env,
    projectRoot: options.projectRoot
  });

  return result.exitStatus ?? 1;
}
