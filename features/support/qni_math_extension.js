const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

async function registerMathExtension(world, options = {}) {
  const extensionModule = require(path.join(PROJECT_ROOT, 'dist', 'qni-math', 'index.js'));
  const { setCapabilities } = require('@earendil-works/pi-tui');
  const commands = new Map();
  const tools = new Map();
  const terminalWrites = [];
  const sessionEntries = options.newSession ? [] : (world.qniMathSessionEntries ?? []);
  let sessionStart;
  let transformer;
  let inputListener;
  const previousHome = process.env.HOME;
  const previousConfigHome = process.env.XDG_CONFIG_HOME;
  const previousTmux = process.env.TMUX;
  const previousTerm = process.env.TERM;
  const previousMacros = process.env.QNI_MATH_MACROS;
  const configHome = path.join(world.scenarioDir, 'qni-math-config');
  const configPath = path.join(configHome, 'qni-cli', 'qni-math.json');

  process.env.HOME = world.scenarioDir;
  process.env.XDG_CONFIG_HOME = configHome;
  if (options.envMacros !== undefined) process.env.QNI_MATH_MACROS = options.envMacros;
  else delete process.env.QNI_MATH_MACROS;
  if (options.configMacros !== undefined || options.configRaw !== undefined) {
    mkdirSync(path.dirname(configPath), { recursive: true });
    const config = options.configRaw ?? JSON.stringify({ macros: options.configMacros });
    writeFileSync(configPath, config);
  }
  if (options.tmux) process.env.TMUX = '/tmp/tmux-test/default,1,0';
  else delete process.env.TMUX;
  if (options.term) process.env.TERM = options.term;
  setCapabilities({ images: null, trueColor: true, hyperlinks: true });

  try {
    extensionModule.default({
      on(event, handler) {
        if (event === 'session_start') sessionStart = handler;
      },
      appendEntry(customType, data) {
        sessionEntries.push({ type: 'custom', customType, data });
      },
      registerCommand(name, commandOptions) {
        commands.set(name, commandOptions);
      },
      registerMarkdownTransformer(registered) {
        transformer = registered;
      },
      registerTool(tool) {
        tools.set(tool.name, tool);
      },
      exec(command, args, execOptions = {}) {
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

    assert.ok(transformer, 'expected qni-math to register a Markdown transformer');
    assert.ok(sessionStart, 'expected qni-math to observe session startup');
    await sessionStart({}, {
      mode: 'tui',
      sessionManager: { getBranch: () => sessionEntries },
      ui: {
        theme: { getFgAnsi: () => '\x1b[38;2;212;212;212m' },
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
                  if (result?.data) world.qniMathForwardedInput = result.data;
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
    });
  } finally {
    if (previousHome === undefined) delete process.env.HOME;
    else process.env.HOME = previousHome;
    if (previousConfigHome === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = previousConfigHome;
    if (previousTmux === undefined) delete process.env.TMUX;
    else process.env.TMUX = previousTmux;
    if (previousTerm === undefined) delete process.env.TERM;
    else process.env.TERM = previousTerm;
    if (previousMacros === undefined) delete process.env.QNI_MATH_MACROS;
    else process.env.QNI_MATH_MACROS = previousMacros;
  }

  world.qniMathCommands = commands;
  world.qniMathTools = tools;
  world.qniMathTransformer = transformer;
  world.qniMathSessionEntries = sessionEntries;
  world.qniMathTerminalWrites = terminalWrites;
}

module.exports = { PROJECT_ROOT, registerMathExtension };
