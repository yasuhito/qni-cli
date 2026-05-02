import { spawnSync } from 'node:child_process';
import path = require('node:path');

export interface RubyDelegateOptions {
  argv: string[];
  env: NodeJS.ProcessEnv;
  projectRoot: string;
}

export function delegateToRuby(options: RubyDelegateOptions): number {
  const result = spawnSync('bundle', ['exec', rubyEntrypoint(options.projectRoot), ...options.argv], {
    cwd: process.cwd(),
    env: rubyEnv(options),
    stdio: 'inherit'
  });

  if (result.error) {
    console.error(result.error.message);
    return 127;
  }

  if (result.signal) {
    return 1;
  }

  return result.status ?? 1;
}

function rubyEntrypoint(projectRoot: string): string {
  return path.join(projectRoot, 'bin', 'qni');
}

function rubyEnv(options: RubyDelegateOptions): NodeJS.ProcessEnv {
  return {
    ...options.env,
    BUNDLE_GEMFILE: path.join(options.projectRoot, 'Gemfile')
  };
}
