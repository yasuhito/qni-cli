import { delegateToRuby } from './ruby_delegate';

export type CommandHandler = (argv: string[]) => number;
export type RouteTarget = 'ruby' | 'typescript';

export interface DispatcherOptions {
  env: NodeJS.ProcessEnv;
  projectRoot: string;
}

interface CommandRoute {
  handler?: CommandHandler;
  target: RouteTarget;
}

const TYPESCRIPT_ROUTES = new Map<string, CommandHandler>();

export function createDispatcher(options: DispatcherOptions): Dispatcher {
  return new Dispatcher(options);
}

export class Dispatcher {
  private readonly env: NodeJS.ProcessEnv;
  private readonly projectRoot: string;

  constructor(options: DispatcherOptions) {
    this.env = options.env;
    this.projectRoot = options.projectRoot;
  }

  run(argv: string[]): number {
    const route = this.routeFor(argv);

    if (route.target === 'typescript' && route.handler) {
      return route.handler(argv);
    }

    return delegateToRuby({
      argv,
      env: this.env,
      projectRoot: this.projectRoot
    });
  }

  private routeFor(argv: string[]): CommandRoute {
    if (this.useRubyOverride()) {
      return { target: 'ruby' };
    }

    const handler = TYPESCRIPT_ROUTES.get(commandName(argv));

    if (handler) {
      return {
        handler,
        target: 'typescript'
      };
    }

    return { target: 'ruby' };
  }

  private useRubyOverride(): boolean {
    return this.env.QNI_USE_RUBY === '1';
  }
}

function commandName(argv: string[]): string {
  return argv[0] ?? '';
}
