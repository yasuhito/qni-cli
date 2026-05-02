const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');
const assert = require('node:assert/strict');

const { Given, Then, When } = require('@cucumber/cucumber');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const QNI_BIN = path.join(PROJECT_ROOT, 'bin', 'qni');
const NODE_QNI_BIN = path.join(PROJECT_ROOT, 'dist', 'bin', 'qni.js');
const PYTHON_SYMBOLIC = path.join(PROJECT_ROOT, '.python-symbolic', 'bin', 'python');
const MPLCONFIGDIR = process.env.MPLCONFIGDIR || path.join(os.tmpdir(), 'qni-cli-matplotlib');
const ONE_QUBIT_INITIAL_STATE_COLS = new Map([
  ['|0>', [[1]]],
  ['|1>', [['X']]],
  ['0.6|0> + 0.8|1>', [['Ry(1.8545904360032246)']]],
  ['cos(theta/2)|0> + sin(theta/2)|1>', [['Ry(theta)']]],
  ['cos(θ/2)|0> + sin(θ/2)|1>', [['Ry(theta)']]]
]);
const TWO_QUBIT_INITIAL_STATE_COLS = new Map([
  ['|00>', [[1, 1]]],
  ['|01>', [[1, 'X']]],
  ['|10>', [['X', 1]]],
  ['|11>', [['X', 'X']]],
  ['0.6|00> + 0.8|01>', [[1, 'Ry(1.8545904360032246)']]]
]);

function splitCommand(command) {
  const words = [];
  let current = '';
  let quote = null;
  let escaping = false;

  for (const char of command) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === '\\' && quote !== "'") {
      escaping = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current.length > 0) {
        words.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (escaping) {
    current += '\\';
  }

  if (quote) {
    throw new Error(`unterminated quote in command: ${command}`);
  }

  if (current.length > 0) {
    words.push(current);
  }

  return words;
}

function bundlerEnv(extraEnv = {}) {
  return {
    ...process.env,
    ...extraEnv,
    BUNDLE_GEMFILE: path.join(PROJECT_ROOT, 'Gemfile'),
    MPLCONFIGDIR
  };
}

function runQniCommand(scenarioDir, command, extraEnv = {}) {
  return runNodeQniCommand(scenarioDir, command, extraEnv);
}

function runNodeDispatcherCommand(scenarioDir, command, extraEnv = {}) {
  return runNodeQniCommand(scenarioDir, command, extraEnv);
}

function runNodeQniCommand(scenarioDir, command, extraEnv = {}) {
  const argv = splitCommand(command);

  if (argv[0] !== 'qni') {
    throw new Error(`command must start with qni: ${command}`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn('node', [NODE_QNI_BIN, ...argv.slice(1)], {
      cwd: scenarioDir,
      env: bundlerEnv(extraEnv)
    });

    const stdout = [];
    const stderr = [];

    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code, signal) => {
      resolve({
        code,
        signal,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8')
      });
    });
  });
}

function shellQuote(value) {
  return `'${value.replace(/'/gu, "'\\''")}'`;
}

function runQniCommandInTty(scenarioDir, command, extraEnv = {}) {
  const argv = splitCommand(command);

  if (argv[0] !== 'qni') {
    throw new Error(`command must start with qni: ${command}`);
  }

  const ttyCommand = ['bundle', 'exec', QNI_BIN, ...argv.slice(1)]
    .map(shellQuote)
    .join(' ');

  return new Promise((resolve, reject) => {
    const child = spawn('script', ['-qfec', ttyCommand, '/dev/null'], {
      cwd: scenarioDir,
      env: bundlerEnv(extraEnv)
    });

    const stdout = [];
    const stderr = [];

    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code, signal) => {
      resolve({
        code,
        signal,
        stdout: Buffer.concat(stdout).toString('utf8').replace(/\r\n/gu, '\n'),
        stderr: Buffer.concat(stderr).toString('utf8')
      });
    });
  });
}

function normalizeMultilineText(value) {
  return value
    .replace(/\n+$/u, '')
    .split('\n')
    .map((line) => line.replace(/\s+$/u, ''))
    .join('\n');
}

function docStringContent(docString) {
  return typeof docString === 'string' ? docString : docString.content;
}

function commandFailureMessage(result) {
  return [
    'expected command to succeed, but it failed',
    `exit status: ${result.code}`,
    'stdout:',
    result.stdout,
    'stderr:',
    result.stderr
  ].join('\n');
}

function commandSuccessMessage(result) {
  return [
    'expected command to fail, but it succeeded',
    'stdout:',
    result.stdout,
    'stderr:',
    result.stderr
  ].join('\n');
}

function writeCircuitJson(scenarioDir, data) {
  fs.writeFileSync(
    path.join(scenarioDir, 'circuit.json'),
    `${JSON.stringify(data, null, 2)}\n`
  );
}

function projectFilePath(filePath) {
  return path.join(PROJECT_ROOT, filePath);
}

function readCircuitJson(scenarioDir) {
  return JSON.parse(fs.readFileSync(path.join(scenarioDir, 'circuit.json'), 'utf8'));
}

function appendCircuitJson(scenarioDir, data) {
  const actual = readCircuitJson(scenarioDir);
  const actualQubits = actual.qubits;
  const appendedQubits = data.qubits;

  if (actualQubits !== appendedQubits) {
    throw new Error(`qubit count mismatch: ${actualQubits} != ${appendedQubits}`);
  }

  writeCircuitJson(scenarioDir, {
    ...actual,
    cols: [...actual.cols, ...data.cols]
  });
}

function parseAsciiCircuit(asciiArt) {
  const script = [
    'begin',
    '  circuit = Qni::View::AsciiCircuitParser.new(STDIN.read).parse',
    '  puts JSON.generate(ok: true, circuit: circuit.to_h)',
    'rescue Qni::View::AsciiCircuitParser::Error => e',
    '  puts JSON.generate(ok: false, error: e.message)',
    'end'
  ].join('\n');

  return JSON.parse(execFileSync(
    'bundle',
    ['exec', 'ruby', '-Ilib', '-rjson', '-rqni/view/ascii_circuit_parser', '-e', script],
    {
      cwd: PROJECT_ROOT,
      env: bundlerEnv(),
      input: asciiArt,
      encoding: 'utf8'
    }
  ));
}

function writeAsciiCircuitJson(scenarioDir, asciiArt) {
  const result = parseAsciiCircuit(asciiArt);

  if (!result.ok) {
    throw new Error(result.error);
  }

  writeCircuitJson(scenarioDir, result.circuit);
}

function appendAsciiCircuitJson(scenarioDir, asciiArt) {
  const result = parseAsciiCircuit(asciiArt);

  if (!result.ok) {
    throw new Error(result.error);
  }

  appendCircuitJson(scenarioDir, result.circuit);
}

function directInitialState(state) {
  const script = [
    'begin',
    '  initial_state = Qni::InitialState.parse(STDIN.read.sub(/\\n+\\z/, ""))',
    '  puts JSON.generate(ok: true, qubits: initial_state.qubits, state: initial_state.to_h)',
    'rescue Qni::InitialState::Error => e',
    '  puts JSON.generate(ok: false, error: e.message)',
    'end'
  ].join('\n');

  const result = JSON.parse(execFileSync(
    'bundle',
    ['exec', 'ruby', '-Ilib', '-rjson', '-rqni/initial_state', '-e', script],
    {
      cwd: PROJECT_ROOT,
      env: bundlerEnv(),
      input: state,
      encoding: 'utf8'
    }
  ));

  return result.ok ? result : undefined;
}

function initialStateVectorCols(state) {
  for (const supportedStates of [ONE_QUBIT_INITIAL_STATE_COLS, TWO_QUBIT_INITIAL_STATE_COLS]) {
    const cols = supportedStates.get(state);

    if (cols) {
      return cols;
    }
  }

  throw new Error(`unsupported initial state: ${state}`);
}

function writeInitialStateVector(scenarioDir, docString) {
  const state = normalizeMultilineText(docString);
  const initialState = directInitialState(state);

  if (initialState) {
    writeCircuitJson(scenarioDir, {
      qubits: initialState.qubits,
      initial_state: initialState.state,
      cols: [Array(initialState.qubits).fill(1)]
    });
    return;
  }

  const cols = initialStateVectorCols(state);

  writeCircuitJson(scenarioDir, {
    qubits: cols[0].length,
    cols
  });
}

function compactUnitCoefficients(text) {
  return text
    .replace(/^1(?:\.0+)?(?=\|)/u, '')
    .replace(/^1(?:\.0+)?i(?=\|)/u, 'i')
    .replace(/(?<= \+ )1(?:\.0+)?(?=\|)/gu, '')
    .replace(/(?<= \+ )1(?:\.0+)?i(?=\|)/gu, 'i')
    .replace(/(?<= - )1(?:\.0+)?(?=\|)/gu, '')
    .replace(/(?<= - )1(?:\.0+)?i(?=\|)/gu, 'i')
    .replace(/^-1(?:\.0+)?(?=\|)/u, '-')
    .replace(/(?<= \+ )-1(?:\.0+)?(?=\|)/gu, '-')
    .replace(/^-1(?:\.0+)?i(?=\|)/u, '-i')
    .replace(/(?<= \+ )-1(?:\.0+)?i(?=\|)/gu, '-i');
}

function trimTrailingDecimalZeros(text) {
  return text.replace(/-?\d+\.\d+/gu, (number) => number
    .replace(/(\.\d*?[1-9])0+$/u, '$1')
    .replace(/\.0+$/u, ''));
}

function normalizeImaginaryUnit(text) {
  return text
    .replaceAll('*I', 'i')
    .replace(/\bI\b/gu, 'i')
    .replace(/\bi\*(?=[a-zA-Z_])/gu, 'i')
    .replace(/\b-i\*(?=[a-zA-Z_])/gu, '-i');
}

function normalizeSymbolicShorthand(text) {
  return text
    .replaceAll('|+>', 'sqrt(2)/2|0> + sqrt(2)/2|1>')
    .replaceAll('|->', 'sqrt(2)/2|0> - sqrt(2)/2|1>');
}

function normalizeSymbolicAliases(text) {
  return text
    .replaceAll('θ', 'theta')
    .replaceAll('α', 'alpha')
    .replaceAll('β', 'beta')
    .replaceAll('π', 'pi')
    .replaceAll('√2', 'sqrt(2)')
    .replace(/(\d(?:\.\d+)?)(?=sqrt\(2\))/gu, '$1*');
}

function normalizePhaseFactorOrder(text) {
  return text.replace(/exp\(([^)]+)\)([a-zA-Z_][a-zA-Z0-9_]*)/gu, '$2*exp($1)');
}

function normalizeSymbolicStateVector(stdout) {
  return compactUnitCoefficients(stdout.replace(/\n+$/u, ''));
}

function canonicalSymbolicNotation(text) {
  return trimTrailingDecimalZeros(
    normalizePhaseFactorOrder(
      normalizeSymbolicAliases(
        normalizeImaginaryUnit(
          normalizeSymbolicShorthand(text)
        )
      )
    )
  );
}

function canonicalNamedBasisNotation(text) {
  return trimTrailingDecimalZeros(
    text
      .replaceAll('θ', 'theta')
      .replaceAll('α', 'alpha')
      .replaceAll('β', 'beta')
      .replaceAll('π', 'pi')
      .replaceAll('√2', 'sqrt(2)')
      .replace(/(\d(?:\.\d+)?)(?=sqrt\(2\))/gu, '$1*')
  );
}

function assertSymbolicStateMatches(stdout, docString) {
  const actual = canonicalSymbolicNotation(normalizeSymbolicStateVector(stdout));
  const expected = canonicalSymbolicNotation(docString);

  assert.equal(actual, expected, [
    'expected symbolic state vector to match',
    'expected:',
    expected,
    'actual:',
    actual
  ].join('\n'));
}

function assertNamedBasisStateMatches(stdout, docString) {
  const actual = canonicalNamedBasisNotation(normalizeSymbolicStateVector(stdout));
  const expected = canonicalNamedBasisNotation(docString);

  assert.equal(actual, expected, [
    'expected named-basis state vector to match',
    'expected:',
    expected,
    'actual:',
    actual
  ].join('\n'));
}

function twoQubitInitialCols(state) {
  const cols = TWO_QUBIT_INITIAL_STATE_COLS.get(state);

  if (!cols) {
    throw new Error(`unsupported 2-qubit initial state: ${state}`);
  }

  return cols;
}

function pythonJson(script, args = []) {
  const output = execFileSync(PYTHON_SYMBOLIC, ['-c', script, ...args], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      MPLCONFIGDIR
    },
    encoding: 'utf8'
  });
  return JSON.parse(output);
}

function assertPngSignature(actualPath, filePath) {
  const signature = fs.readFileSync(actualPath).subarray(0, 8);
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.deepEqual(signature, pngSignature, `expected file to be a PNG image: ${filePath}`);
}

function pngChunks(actualPath, filePath) {
  const png = fs.readFileSync(actualPath);
  assertPngSignature(actualPath, filePath);

  const chunks = [];
  let offset = 8;

  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    assert.ok(
      dataEnd + 4 <= png.length,
      `expected complete PNG chunk ${type} in: ${filePath}`
    );

    chunks.push({ type, dataStart, length });
    offset = dataEnd + 4;

    if (type === 'IEND') {
      break;
    }
  }

  return { png, chunks };
}

function apngMetadata(actualPath, filePath) {
  const { png, chunks } = pngChunks(actualPath, filePath);
  const animationControl = chunks.find((chunk) => chunk.type === 'acTL');
  const frameChunks = chunks.filter((chunk) => chunk.type === 'fcTL');

  return {
    animated: animationControl !== undefined,
    frameCount: animationControl
      ? png.readUInt32BE(animationControl.dataStart)
      : frameChunks.length
  };
}

function pngMetadata(actualPath) {
  const script = `
from PIL import Image
import json
import sys

image = Image.open(sys.argv[1])
rgba = image.convert("RGBA")
alpha = rgba.getchannel("A")
transparent = alpha.getextrema()[0] < 255
print(json.dumps({
    "width": image.width,
    "height": image.height,
    "transparent": transparent
}))
`;
  return pythonJson(script, [actualPath]);
}

function imageIncludesColor(actualPath, hexColor) {
  const color = hexColor.replace(/^#/, '');
  const script = `
from PIL import Image
import json
import sys

image = Image.open(sys.argv[1]).convert("RGBA")
pixels = image.load()
width, height = image.size
target = tuple(int(sys.argv[2][index:index + 2], 16) for index in (0, 2, 4))
print(json.dumps(any(
    pixels[x, y][:3] == target and pixels[x, y][3] > 0
    for y in range(height)
    for x in range(width)
)))
`;
  return pythonJson(script, [actualPath, color]);
}

function circleNotationPhaseMetrics(real, imag) {
  const script = `
import importlib.util
import json
import math
import sys

import matplotlib.pyplot as plt

spec = importlib.util.spec_from_file_location("qni_circle_notation_render", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

fig, ax = plt.subplots(figsize=(2, 2), dpi=module.DPI)
ax.set_axis_off()
ax.set_xlim(-2, 2)
ax.set_ylim(-2, 2)
ax.set_aspect("equal")

module.draw_basis_circle(
    ax,
    0.0,
    0.0,
    "|0>",
    complex(float(sys.argv[2]), float(sys.argv[3])),
    module.theme_config("light")
)

phase_lines = [
    line for line in ax.lines
    if len(line.get_xdata()) == 2 and len(line.get_ydata()) == 2
]
if phase_lines:
    line = phase_lines[0]
    xdata = list(line.get_xdata())
    ydata = list(line.get_ydata())
    needle_dx = xdata[1] - xdata[0]
    needle_dy = ydata[1] - ydata[0]
    needle_length = math.hypot(needle_dx, needle_dy)
    phase_visible = True
else:
    needle_dx = 0.0
    needle_dy = 0.0
    needle_length = 0.0
    phase_visible = False

center_dot_visible = any(
    line.get_marker() == "o" and len(line.get_xdata()) == 1 and len(line.get_ydata()) == 1
    for line in ax.lines
)

plt.close(fig)
print(json.dumps({
    "outer_radius": module.OUTER_RADIUS,
    "needle_dx": needle_dx,
    "needle_dy": needle_dy,
    "needle_length": needle_length,
    "phase_visible": phase_visible,
    "center_dot_visible": center_dot_visible
}))
`;
  const helperPath = path.join(PROJECT_ROOT, 'libexec', 'qni_circle_notation_render.py');
  return pythonJson(script, [helperPath, String(real), String(imag)]);
}

function circleNotationOutlineMetrics() {
  const script = `
import importlib.util
import json
import sys

import matplotlib.pyplot as plt

spec = importlib.util.spec_from_file_location("qni_circle_notation_render", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

fig, ax = plt.subplots(figsize=(2, 2), dpi=module.DPI)
ax.set_axis_off()
ax.set_xlim(-2, 2)
ax.set_ylim(-2, 2)
ax.set_aspect("equal")
fig.canvas.draw()

module.draw_basis_circle(
    ax,
    0.0,
    0.0,
    "|0>",
    complex(1.0, 0.0),
    module.theme_config("light")
)

outer = ax.patches[0]
linewidth_px = outer.get_linewidth() * fig.dpi / 72.0
origin = ax.transData.transform((0.0, 0.0))
unit_x = ax.transData.transform((1.0, 0.0))
pixels_per_data = unit_x[0] - origin[0]
half_linewidth_data = (linewidth_px / pixels_per_data) / 2.0

plt.close(fig)
print(json.dumps({
    "intended_radius": module.OUTER_RADIUS,
    "outline_radius": outer.get_radius(),
    "outline_inner_edge": outer.get_radius() - half_linewidth_data
}))
`;
  const helperPath = path.join(PROJECT_ROOT, 'libexec', 'qni_circle_notation_render.py');
  return pythonJson(script, [helperPath]);
}

function blochLabelMetrics() {
  const script = `
import importlib.util
import json
import sys

spec = importlib.util.spec_from_file_location("qni_bloch_render", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
print(json.dumps(module.label_metrics()))
`;
  const helperPath = path.join(PROJECT_ROOT, 'libexec', 'qni_bloch_render.py');
  return pythonJson(script, [helperPath]);
}

Given('空の 1 qubit 回路がある', function () {
  writeCircuitJson(this.scenarioDir, {
    qubits: 1,
    cols: [[1]]
  });
});

Given('空の 2 qubit 回路がある', function () {
  writeCircuitJson(this.scenarioDir, {
    qubits: 2,
    cols: [[1, 1]]
  });
});

Given('2 qubit の初期状態が {string} である', function (state) {
  writeCircuitJson(this.scenarioDir, {
    qubits: 2,
    cols: twoQubitInitialCols(state)
  });
});

Given('初期状態ベクトルは:', function (docString) {
  writeInitialStateVector(this.scenarioDir, docStringContent(docString));
});

Given('空の 3 qubit 回路がある', function () {
  writeCircuitJson(this.scenarioDir, {
    qubits: 3,
    cols: [[1, 1, 1]]
  });
});

When('{string} を実行', async function (command) {
  this.lastCommand = await runQniCommand(this.scenarioDir, command, this.commandEnv);
});

When('Node dispatcher で {string} を実行', async function (command) {
  this.lastCommand = await runNodeDispatcherCommand(this.scenarioDir, command, this.commandEnv);
});

Given('次の circuit.json がある:', function (docString) {
  fs.writeFileSync(
    path.join(this.scenarioDir, 'circuit.json'),
    `${JSON.stringify(JSON.parse(docStringContent(docString)), null, 2)}\n`
  );
});

Given('次の回路図がある:', function (docString) {
  writeAsciiCircuitJson(this.scenarioDir, docStringContent(docString));
});

When('次の回路図を読み込もうとする:', function (docString) {
  this.lastAsciiParse = parseAsciiCircuit(docStringContent(docString));
});

When('次の回路図を適用:', function (docString) {
  appendAsciiCircuitJson(this.scenarioDir, docStringContent(docString));
});

When('次の回路を適用:', function (docString) {
  appendAsciiCircuitJson(this.scenarioDir, docStringContent(docString));
});

Given('{string} は存在しない', function (filePath) {
  const actualPath = path.join(this.scenarioDir, filePath);

  assert.equal(fs.existsSync(actualPath), false, `expected file not to exist: ${filePath}`);
});

Given('環境変数 {string} を {string} に設定する', function (name, value) {
  this.commandEnv ||= {};
  this.commandEnv[name] = value;
});

When('{string} を TTY で実行', async function (command) {
  this.lastCommand = await runQniCommandInTty(this.scenarioDir, command, this.commandEnv);
});

Then('コマンドは成功', function () {
  assert.equal(this.lastCommand.code, 0, commandFailureMessage(this.lastCommand));
});

Then('コマンドは失敗', function () {
  assert.notEqual(this.lastCommand.code, 0, commandSuccessMessage(this.lastCommand));
});

Then('標準出力は空', function () {
  assert.equal(this.lastCommand.stdout, '');
});

Then('状態ベクトルは:', async function (docString) {
  const result = await runQniCommand(this.scenarioDir, 'qni run --symbolic');

  assert.equal(result.code, 0, commandFailureMessage(result));
  assertSymbolicStateMatches(result.stdout, docStringContent(docString));
});

Then('計算基底での状態ベクトルは:', async function (docString) {
  const result = await runQniCommand(this.scenarioDir, 'qni run --symbolic');

  assert.equal(result.code, 0, commandFailureMessage(result));
  assertSymbolicStateMatches(result.stdout, docStringContent(docString));
});

Then('|+>, |-> 基底での状態ベクトルは:', async function (docString) {
  const result = await runQniCommand(this.scenarioDir, 'qni run --symbolic --basis x');

  assert.equal(result.code, 0, commandFailureMessage(result));
  assertNamedBasisStateMatches(result.stdout, docStringContent(docString));
});

Then('|+i>, |-i> 基底での状態ベクトルは:', async function (docString) {
  const result = await runQniCommand(this.scenarioDir, 'qni run --symbolic --basis y');

  assert.equal(result.code, 0, commandFailureMessage(result));
  assertNamedBasisStateMatches(result.stdout, docStringContent(docString));
});

Then('Bell 基底での状態ベクトルは:', async function (docString) {
  const result = await runQniCommand(this.scenarioDir, 'qni run --symbolic --basis bell');

  assert.equal(result.code, 0, commandFailureMessage(result));
  assertNamedBasisStateMatches(result.stdout, docStringContent(docString));
});

Then('標準出力に次を含む:', function (docString) {
  const expected = docStringContent(docString);

  assert.ok(
    this.lastCommand.stdout.includes(expected),
    [
      'expected stdout to include',
      'expected:',
      expected,
      'actual:',
      this.lastCommand.stdout
    ].join('\n')
  );
});

Then('標準出力に次を含まない:', function (docString) {
  const unexpected = docStringContent(docString);

  assert.ok(
    !this.lastCommand.stdout.includes(unexpected),
    [
      'expected stdout not to include',
      'unexpected:',
      unexpected,
      'actual:',
      this.lastCommand.stdout
    ].join('\n')
  );
});

Then('標準出力は Kitty graphics escape sequence を含む', function () {
  assert.ok(
    this.lastCommand.stdout.includes('\u001b_G'),
    [
      'expected stdout to include Kitty graphics escape sequence',
      `actual: ${JSON.stringify(this.lastCommand.stdout)}`
    ].join('\n')
  );
});

Then('標準出力は {int} 個以上の Kitty graphics escape sequence を含む', function (minimumCount) {
  const actualCount = [...this.lastCommand.stdout.matchAll(/\u001b_G/gu)].length;

  assert.ok(
    actualCount >= minimumCount,
    [
      `expected stdout to include at least ${minimumCount} Kitty graphics escape sequences`,
      `actual: ${actualCount}`
    ].join('\n')
  );
});

Then('{string} の内容:', function (filePath, docString) {
  assert.equal(this.lastCommand.code, 0, commandFailureMessage(this.lastCommand));

  const actualPath = path.join(this.scenarioDir, filePath);
  assert.ok(fs.existsSync(actualPath), `expected file to exist: ${filePath}`);

  const actual = JSON.parse(fs.readFileSync(actualPath, 'utf8'));
  const expected = JSON.parse(docStringContent(docString));
  assert.deepEqual(actual, expected);
});

Then('{string} の JSON 内容:', function (filePath, docString) {
  const actualPath = path.join(this.scenarioDir, filePath);
  assert.ok(fs.existsSync(actualPath), `expected file to exist: ${filePath}`);

  const actual = JSON.parse(fs.readFileSync(actualPath, 'utf8'));
  const expected = JSON.parse(docStringContent(docString));
  assert.deepEqual(actual, expected);
});

Then('回路図:', function (docString) {
  assert.equal(this.lastCommand.code, 0, commandFailureMessage(this.lastCommand));

  assert.equal(
    normalizeMultilineText(this.lastCommand.stdout),
    normalizeMultilineText(docStringContent(docString))
  );
});

Then('標準出力:', function (docString) {
  assert.equal(this.lastCommand.code, 0, commandFailureMessage(this.lastCommand));

  assert.equal(
    normalizeMultilineText(this.lastCommand.stdout),
    normalizeMultilineText(docStringContent(docString))
  );
});

Then('標準出力の内容:', function (docString) {
  assert.equal(
    normalizeMultilineText(this.lastCommand.stdout),
    normalizeMultilineText(docStringContent(docString))
  );
});

Then('標準エラー:', function (docString) {
  assert.equal(
    normalizeMultilineText(this.lastCommand.stderr),
    normalizeMultilineText(docStringContent(docString))
  );
});

Then('読み込みは成功', function () {
  assert.equal(this.lastAsciiParse.ok, true, this.lastAsciiParse.error);
});

Then('リポジトリファイル {string} は存在する', function (filePath) {
  assert.ok(
    fs.existsSync(projectFilePath(filePath)),
    `expected repository file to exist: ${filePath}`
  );
});

Then('リポジトリファイル {string} は {string} を含む', function (filePath, text) {
  const actualPath = projectFilePath(filePath);
  assert.ok(fs.existsSync(actualPath), `expected repository file to exist: ${filePath}`);

  const actual = fs.readFileSync(actualPath, 'utf8');
  assert.ok(
    actual.includes(text),
    [
      'expected repository file to include text',
      `file: ${filePath}`,
      `expected: ${text}`
    ].join('\n')
  );
});

Then('標準出力に dim 修飾付きラベル {string} を含む', function (label) {
  const chars = [...label];

  assert.ok(chars.length >= 2, `label must have at least 2 characters: ${label}`);

  const base = chars.slice(0, -1).join('');
  const suffix = chars.at(-1);
  const expected = `${base}\u001b[37;2m${suffix}\u001b[0m`;

  assert.ok(
    this.lastCommand.stdout.includes(expected),
    [
      'expected stdout to include dim-decorated label',
      `expected: ${JSON.stringify(expected)}`,
      `actual: ${JSON.stringify(this.lastCommand.stdout)}`
    ].join('\n')
  );
});

Then('コマンドは失敗して標準エラー:', function (docString) {
  assert.notEqual(this.lastCommand.code, 0, commandSuccessMessage(this.lastCommand));

  assert.equal(
    normalizeMultilineText(this.lastCommand.stderr),
    normalizeMultilineText(docStringContent(docString))
  );
});

Then('{string} は PNG 画像である', function (filePath) {
  const actualPath = path.join(this.scenarioDir, filePath);

  assert.ok(fs.existsSync(actualPath), `expected file to exist: ${filePath}`);
  assertPngSignature(actualPath, filePath);
});

Then('{string} は APNG 画像である', function (filePath) {
  const actualPath = path.join(this.scenarioDir, filePath);

  assert.ok(fs.existsSync(actualPath), `expected file to exist: ${filePath}`);
  assert.equal(apngMetadata(actualPath, filePath).animated, true);
});

Then('{string} は {int} フレーム以上の APNG 画像である', function (filePath, minimumFrames) {
  const actualPath = path.join(this.scenarioDir, filePath);

  assert.ok(fs.existsSync(actualPath), `expected file to exist: ${filePath}`);
  assert.ok(
    apngMetadata(actualPath, filePath).frameCount >= minimumFrames,
    `expected APNG frame count to be at least ${minimumFrames}: ${filePath}`
  );
});

Then('{string} は透過 PNG 画像である', function (filePath) {
  const actualPath = path.join(this.scenarioDir, filePath);

  assert.ok(fs.existsSync(actualPath), `expected file to exist: ${filePath}`);
  assertPngSignature(actualPath, filePath);
  assert.equal(pngMetadata(actualPath).transparent, true);
});

Then('{string} は不透過 PNG 画像である', function (filePath) {
  const actualPath = path.join(this.scenarioDir, filePath);

  assert.ok(fs.existsSync(actualPath), `expected file to exist: ${filePath}`);
  assertPngSignature(actualPath, filePath);
  assert.equal(pngMetadata(actualPath).transparent, false);
});

Then('{string} の画像サイズは {int}x{int} である', function (filePath, width, height) {
  const actualPath = path.join(this.scenarioDir, filePath);

  assert.ok(fs.existsSync(actualPath), `expected file to exist: ${filePath}`);
  const metadata = pngMetadata(actualPath);

  assert.deepEqual([metadata.width, metadata.height], [width, height]);
});

Then('{string} は色 {string} のピクセルを含む', function (filePath, hexColor) {
  const actualPath = path.join(this.scenarioDir, filePath);

  assert.ok(fs.existsSync(actualPath), `expected file to exist: ${filePath}`);
  assert.ok(
    imageIncludesColor(actualPath, hexColor),
    `expected image to include color ${hexColor}: ${filePath}`
  );
});

Then('{string} と {string} は異なるファイル内容である', function (lhsPath, rhsPath) {
  const actualLhsPath = path.join(this.scenarioDir, lhsPath);
  const actualRhsPath = path.join(this.scenarioDir, rhsPath);

  assert.ok(fs.existsSync(actualLhsPath), `expected file to exist: ${lhsPath}`);
  assert.ok(fs.existsSync(actualRhsPath), `expected file to exist: ${rhsPath}`);
  assert.notDeepEqual(fs.readFileSync(actualLhsPath), fs.readFileSync(actualRhsPath));
});

Then('circle notation renderer では振幅 {float} の位相針の長さは外円の半径に等しい', function (real) {
  const metrics = circleNotationPhaseMetrics(real, 0.0);
  const actual = metrics.needle_length;
  const expected = metrics.outer_radius;

  assert.ok(
    metrics.phase_visible && Math.abs(actual - expected) <= 0.001,
    [
      'expected phase needle length to equal the outer radius for nonzero amplitudes',
      `actual: ${actual}`,
      `expected: ${expected}`
    ].join('\n')
  );
});

Then('circle notation renderer では外円の輪郭線は内側へ食い込まない', function () {
  const metrics = circleNotationOutlineMetrics();
  const actual = metrics.outline_inner_edge;
  const expected = metrics.intended_radius;

  assert.ok(
    actual >= expected - 0.001,
    [
      'expected outline stroke not to intrude inside the intended outer radius',
      `actual: ${actual}`,
      `expected: ${expected}`
    ].join('\n')
  );
});

Then('circle notation renderer では正の実数振幅の位相針は上を向く', function () {
  const metrics = circleNotationPhaseMetrics(1.0, 0.0);

  assert.ok(
    metrics.phase_visible && Math.abs(metrics.needle_dx) <= 0.001 && metrics.needle_dy > 0.0,
    [
      'expected positive real amplitude to point upward',
      `actual: ${JSON.stringify(metrics)}`
    ].join('\n')
  );
});

Then('circle notation renderer では正の虚数振幅の位相針は左を向く', function () {
  const metrics = circleNotationPhaseMetrics(0.0, 1.0);

  assert.ok(
    metrics.phase_visible && metrics.needle_dx < 0.0 && Math.abs(metrics.needle_dy) <= 0.001,
    [
      'expected positive imaginary amplitude to point leftward',
      `actual: ${JSON.stringify(metrics)}`
    ].join('\n')
  );
});

Then('circle notation renderer では振幅 0 のとき位相針は描画されない', function () {
  const metrics = circleNotationPhaseMetrics(0.0, 0.0);

  assert.equal(metrics.phase_visible, false);
});

Then('circle notation renderer では振幅 0 のとき中心ドットも描画されない', function () {
  const metrics = circleNotationPhaseMetrics(0.0, 0.0);

  assert.equal(metrics.center_dot_visible, false);
});

Then('ブロッホ球のラベル {string} の表示は z 軸の先端より上にある', function (label) {
  const metrics = blochLabelMetrics();
  const labelBox = metrics.labels[label].bbox;
  const axisTip = metrics.axis_tips.z;

  assert.ok(
    labelBox.bottom > axisTip.y,
    [
      `expected ${label} to render above the z-axis tip`,
      `bbox: ${JSON.stringify(labelBox)}`,
      `axis_tip: ${JSON.stringify(axisTip)}`
    ].join('\n')
  );
});

Then('ブロッホ球のラベル {string} の表示は x 軸の先端より右にある', function (label) {
  const metrics = blochLabelMetrics();
  const labelBox = metrics.labels[label].bbox;
  const axisTip = metrics.axis_tips.x;

  assert.ok(
    labelBox.left > axisTip.x,
    [
      `expected ${label} to render to the right of the x-axis tip`,
      `bbox: ${JSON.stringify(labelBox)}`,
      `axis_tip: ${JSON.stringify(axisTip)}`
    ].join('\n')
  );
});

Then('ブロッホ球のラベル {string} の表示は y 軸の先端より右にある', function (label) {
  const metrics = blochLabelMetrics();
  const labelBox = metrics.labels[label].bbox;
  const axisTip = metrics.axis_tips.y;

  assert.ok(
    labelBox.left > axisTip.x,
    [
      `expected ${label} to render to the right of the y-axis tip`,
      `bbox: ${JSON.stringify(labelBox)}`,
      `axis_tip: ${JSON.stringify(axisTip)}`
    ].join('\n')
  );
});

Then('ブロッホ球のラベル {string} の表示は y 軸の先端より上にある', function (label) {
  const metrics = blochLabelMetrics();
  const labelBox = metrics.labels[label].bbox;
  const axisTip = metrics.axis_tips.y;

  assert.ok(
    labelBox.bottom > axisTip.y,
    [
      `expected ${label} to render above the y-axis tip`,
      `bbox: ${JSON.stringify(labelBox)}`,
      `axis_tip: ${JSON.stringify(axisTip)}`
    ].join('\n')
  );
});

Then('ブロッホ球のラベル {string} が表示される', function (label) {
  const metrics = blochLabelMetrics();

  assert.ok(
    Object.hasOwn(metrics.labels, label),
    `expected rendered labels to include ${label}`
  );
});

Then('ブロッホ球のラベル {string} と {string} の表示領域は重ならない', function (firstLabel, secondLabel) {
  const metrics = blochLabelMetrics().labels;
  const first = metrics[firstLabel].bbox;
  const second = metrics[secondLabel].bbox;
  const overlap = first.left < second.right &&
    first.right > second.left &&
    first.bottom < second.top &&
    first.top > second.bottom;

  assert.ok(
    !overlap,
    [
      'expected rendered label boxes not to overlap',
      `${firstLabel}: ${JSON.stringify(first)}`,
      `${secondLabel}: ${JSON.stringify(second)}`
    ].join('\n')
  );
});
