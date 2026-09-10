const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
let previousSessionShutdown;

async function registerQniToolsExtension(world, options = {}) {
  previousSessionShutdown?.({ reason: 'test-reset' });
  previousSessionShutdown = undefined;
  const extensionModule = require(path.join(PROJECT_ROOT, 'dist', 'qni-tools', 'index.js'));
  const { setCapabilities } = require('@earendil-works/pi-tui');
  const commands = new Map();
  const commandRegistrations = [];
  const tools = new Map();
  const terminalWrites = [];
  const sessionEntries = options.newSession ? [] : (world.qniToolsSessionEntries ?? []);
  const eventHandlers = new Map();
  const sessionShutdownHandlers = [];
  const sessionStarts = [];
  let sessionStart;
  const transformers = [];
  let transformer;
  let inputListener;
  let textColor = options.textColor ?? '\x1b[38;2;212;212;212m';
  const previousTmux = process.env.TMUX;
  const previousTerm = process.env.TERM;
  const Module = require('node:module');
  const originalLoad = Module._load;
  if (options.tmux) process.env.TMUX = '/tmp/tmux-test/default,1,0';
  else delete process.env.TMUX;
  if (options.term) process.env.TERM = options.term;
  setCapabilities({ images: null, trueColor: true, hyperlinks: true });

  try {
    if (options.formulaAvailable === false || options.formulaModule !== undefined) {
      Module._load = function (request, parent, isMain) {
        if (request === 'pi-formula') {
          if (options.formulaModule !== undefined) return options.formulaModule;
          const error = new Error("Cannot find module 'pi-formula'");
          error.code = 'MODULE_NOT_FOUND';
          throw error;
        }
        return originalLoad.call(this, request, parent, isMain);
      };
    }
    extensionModule.default({
      on(event, handler) {
        eventHandlers.set(event, handler);
        if (event === 'session_shutdown') sessionShutdownHandlers.push(handler);
        if (event === 'session_start') {
          sessionStart = handler;
          sessionStarts.push(handler);
        }
      },
      appendEntry(customType, data) {
        sessionEntries.push({ type: 'custom', customType, data });
      },
      registerCommand(name, commandOptions) {
        commands.set(name, commandOptions);
        commandRegistrations.push([name, commandOptions]);
      },
      registerMarkdownTransformer(registered) {
        transformers.push(registered);
        transformer = registered;
      },
      registerTool(tool) {
        tools.set(tool.name, tool);
      },
      exec(command, args, execOptions = {}) {
        if (options.exec) return options.exec(command, args, execOptions);
        return new Promise((resolve) => {
          execFile(command, args, {
            cwd: execOptions.cwd,
            signal: execOptions.signal,
            encoding: 'utf8'
          }, (error, stdout, stderr) => {
            resolve({
              stdout,
              stderr,
              code: typeof error?.code === 'number' ? error.code : (error ? 1 : 0),
              killed: error?.killed ?? false
            });
          });
        });
      }
    });

    assert.ok(sessionStart, 'expected pi-formula to observe session startup');
    const sessionContext = {
      mode: 'tui',
      sessionManager: { getBranch: () => sessionEntries },
      ui: {
        get theme() {
          return { getFgAnsi: () => textColor };
        },
        setWidget(_key, content) {
          if (typeof content !== 'function') return;
          const tui = {
            terminal: {
              write(data) {
                terminalWrites.push(data);
                const id = data.match(/i=(\d+)/)?.[1];
                if (!id || options.response === null) return;
                const response = options.response ?? 'OK';
                const sequence = `\x1b_Gi=${id};${response}\x1b\\`;
                const deliver = (data) => {
                  const result = inputListener?.(data);
                  if (result?.data) world.qniToolsForwardedInput = result.data;
                };
                if (options.splitResponse) {
                  queueMicrotask(() => deliver(sequence.slice(0, 8)));
                  queueMicrotask(() => deliver(sequence.slice(8)));
                } else if (options.combinedResponse) {
                  queueMicrotask(() => deliver(`typed-${sequence}-tail`));
                } else {
                  queueMicrotask(() => deliver(sequence));
                }
              }
            },
            addInputListener(listener) {
              inputListener = listener;
              return () => {
                if (inputListener === listener) inputListener = undefined;
              };
            }
          };
          content(tui, {});
        },
        notify() {}
      }
    };
    for (const handler of sessionStarts) {
      await handler({ reason: options.sessionStartReason ?? 'startup' }, sessionContext);
    }
  } finally {
    Module._load = originalLoad;
    if (previousTmux === undefined) delete process.env.TMUX;
    else process.env.TMUX = previousTmux;
    if (previousTerm === undefined) delete process.env.TERM;
    else process.env.TERM = previousTerm;
  }

  previousSessionShutdown = sessionShutdownHandlers[0];
  world.qniToolsCommands = new Map();
  for (const [name, command] of commandRegistrations) {
    const registered = world.qniToolsCommands.get(name) ?? [];
    registered.push(command);
    world.qniToolsCommands.set(name, registered);
  }
  world.qniToolsEventHandlers = eventHandlers;
  world.qniToolsTools = tools;
  world.qniToolsTransformer = undefined;
  world.qniToolsTransformers = transformers;
  world.qniFormulaTransformer = transformer;
  world.qniToolsSessionEntries = sessionEntries;
  world.qniToolsTerminalWrites = terminalWrites;
  world.qniToolsSetTextColor = (ansi) => {
    textColor = ansi;
  };
}

module.exports = { PROJECT_ROOT, registerQniToolsExtension };
