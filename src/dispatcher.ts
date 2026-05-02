import {
  chooseCommandImplementation,
  runRubyFallbackSync
} from './process/process_compatibility';
import { runGateCommand } from './commands/gate_command';
import { runStateCommand } from './commands/state_command';
import { runVariableCommand } from './commands/variable_command';

export interface CommandHandlerContext {
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly projectRoot: string;
}

export type CommandHandler = (argv: string[], context: CommandHandlerContext) => number;
export type RouteTarget = 'ruby' | 'typescript';

export interface DispatcherOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  projectRoot: string;
}

interface CommandRoute {
  handler?: CommandHandler;
  target: RouteTarget;
}

const TYPESCRIPT_ROUTES = new Map<string, CommandHandler>([
  ['gate', runGateCommand],
  ['state', runStateCommand],
  ['variable', runVariableCommand]
]);

export function createDispatcher(options: DispatcherOptions): Dispatcher {
  return new Dispatcher(options);
}

export class Dispatcher {
  private readonly cwd: string;
  private readonly env: NodeJS.ProcessEnv;
  private readonly projectRoot: string;

  constructor(options: DispatcherOptions) {
    this.cwd = options.cwd;
    this.env = options.env;
    this.projectRoot = options.projectRoot;
  }

  run(argv: string[]): number {
    const route = this.routeFor(argv);

    if (route.target === 'typescript' && route.handler) {
      return route.handler(argv, {
        cwd: this.cwd,
        env: this.env,
        projectRoot: this.projectRoot
      });
    }

    const result = runRubyFallbackSync({
      argv,
      cwd: this.cwd,
      env: this.env,
      projectRoot: this.projectRoot
    });

    return result.exitStatus ?? 1;
  }

  private routeFor(argv: string[]): CommandRoute {
    const implementation = chooseCommandImplementation({
      argv,
      env: this.env,
      migratedCommands: new Set(TYPESCRIPT_ROUTES.keys())
    });

    if (implementation.kind === 'typescript') {
      return {
        handler: TYPESCRIPT_ROUTES.get(implementation.command),
        target: 'typescript'
      };
    }

    return { target: 'ruby' };
  }
}
