#!/usr/bin/env node

const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const jsonOutput = path.join(projectRoot, 'docs', 'reports', 'ruby-comparison-archive.json');
const markdownOutput = path.join(projectRoot, 'docs', 'reports', 'ruby-comparison-archive.md');
const keepTemp = process.env.QNI_KEEP_RUBY_COMPARISON === '1';

const CASES = [
  {
    name: 'top-level-help',
    argv: ['--help']
  },
  {
    name: 'add-h',
    argv: ['add', 'H', '--qubit', '0', '--step', '0'],
    compareCircuit: true
  },
  {
    name: 'gate-h',
    argv: ['gate', '--qubit', '0', '--step', '0'],
    circuit: { qubits: 1, cols: [['H']] }
  },
  {
    name: 'rm-controlled',
    argv: ['rm', '--qubit', '1', '--step', '0'],
    circuit: { qubits: 2, cols: [['•', 'X']] },
    compareCircuit: true
  },
  {
    name: 'state-set',
    argv: ['state', 'set', 'alpha|0> + beta|1>'],
    compareCircuit: true
  },
  {
    name: 'run-numeric-bell',
    argv: ['run'],
    circuit: { qubits: 2, cols: [['H', 1], ['•', 'X']] }
  },
  {
    name: 'run-symbolic-h',
    argv: ['run', '--symbolic'],
    circuit: { qubits: 1, cols: [['H']] }
  },
  {
    name: 'expect-bell',
    argv: ['expect', 'ZZ', 'XX'],
    circuit: { qubits: 2, cols: [['H', 1], ['•', 'X']] }
  },
  {
    name: 'view-mixed',
    argv: ['view'],
    circuit: { qubits: 2, cols: [['H', 1], ['•', 'X'], ['Ry(pi/4)', 'T†']] }
  },
  {
    name: 'export-latex-source',
    argv: ['export', '--latex-source', '--light'],
    circuit: { qubits: 1, cols: [['H']] }
  },
  {
    name: 'export-png',
    argv: ['export', '--png', '--light', '--output', 'circuit.png'],
    circuit: { qubits: 1, cols: [['H']] },
    files: [{ path: 'circuit.png', type: 'png' }]
  },
  {
    name: 'bloch-png',
    argv: ['bloch', '--png', '--light', '--output', 'bloch.png'],
    circuit: { qubits: 1, cols: [['H']] },
    files: [{ path: 'bloch.png', type: 'png' }]
  },
  {
    name: 'clear-circuit',
    argv: ['clear'],
    circuit: { qubits: 1, cols: [['H']] },
    compareCircuit: true
  },
  {
    name: 'benchmark-run-state-flip',
    mode: 'typescript-only',
    argv: [
      'benchmark',
      'run',
      path.join(projectRoot, 'benchmarks', 'quantum-katas', 'basic-gates', 'state-flip.md'),
      path.join(projectRoot, 'benchmarks', 'solutions', 'quantum-katas', 'basic-gates', 'state-flip.qni')
    ],
    stdoutIncludes: 'PASS StateFlip'
  }
];

function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qni-cli-ruby-comparison-'));

  try {
    const cases = CASES.map((testCase) => runCase(testCase, tempRoot));
    const failed = cases.filter((entry) => entry.status !== 'passed');
    const report = {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      source_commit: commandOutput('git', ['rev-parse', 'HEAD'], projectRoot),
      status: failed.length === 0 ? 'passed' : 'failed',
      summary: {
        total: cases.length,
        passed: cases.length - failed.length,
        failed: failed.length
      },
      runtimes: {
        node: process.version,
        ruby: commandOutput('ruby', ['--version'], projectRoot),
        typescript: commandOutput('npx', ['tsc', '--version'], projectRoot)
      },
      cases
    };

    fs.mkdirSync(path.dirname(jsonOutput), { recursive: true });
    fs.writeFileSync(jsonOutput, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(markdownOutput, markdownReport(report));

    if (failed.length > 0) {
      throw new Error(`Ruby comparison archive failed: ${failed.map((entry) => entry.name).join(', ')}`);
    }

    console.log(`Ruby comparison archive passed: ${cases.length} case(s)`);
    console.log(path.relative(projectRoot, jsonOutput));
    console.log(path.relative(projectRoot, markdownOutput));
  } finally {
    if (keepTemp) {
      console.log(`kept Ruby comparison temp dir: ${tempRoot}`);
    } else {
      fs.rmSync(tempRoot, { force: true, recursive: true });
    }
  }
}

function runCase(testCase, tempRoot) {
  const caseRoot = path.join(tempRoot, safeName(testCase.name));
  const typeScriptDir = path.join(caseRoot, 'typescript');
  fs.mkdirSync(typeScriptDir, { recursive: true });
  writeInitialFiles(typeScriptDir, testCase);

  const typeScript = runQni('typescript', testCase.argv, typeScriptDir);
  const typeScriptSnapshot = snapshot(typeScriptDir, testCase);

  if (testCase.mode === 'typescript-only') {
    const checks = [checkSucceeded(typeScript), checkIncludes(typeScript.stdout, testCase.stdoutIncludes)];
    return caseReport(testCase, checks, { typescript: typeScript, typeScriptSnapshot });
  }

  const rubyDir = path.join(caseRoot, 'ruby');
  fs.mkdirSync(rubyDir, { recursive: true });
  writeInitialFiles(rubyDir, testCase);

  const ruby = runQni('ruby', testCase.argv, rubyDir);
  const rubySnapshot = snapshot(rubyDir, testCase);
  const checks = [
    checkEqual('exit_status', ruby.exit_status, typeScript.exit_status),
    checkEqual('signal', ruby.signal, typeScript.signal),
    checkEqual('stdout', normalizeCliOutput(ruby.stdout), normalizeCliOutput(typeScript.stdout)),
    checkEqual('stderr', normalizeCliOutput(ruby.stderr), normalizeCliOutput(typeScript.stderr)),
    checkEqual('circuit_json', rubySnapshot.circuit_json, typeScriptSnapshot.circuit_json),
    checkEqual('files', rubySnapshot.files, typeScriptSnapshot.files)
  ];

  return caseReport(testCase, checks, { ruby, rubySnapshot, typescript: typeScript, typeScriptSnapshot });
}

function caseReport(testCase, checks, artifacts) {
  const failures = checks.filter((check) => !check.passed);
  const report = {
    name: testCase.name,
    command: qniCommandLine(testCase.argv),
    mode: testCase.mode ?? 'ruby-vs-typescript',
    status: failures.length === 0 ? 'passed' : 'failed',
    checks
  };

  if (artifacts.ruby) {
    report.ruby = commandArtifact(artifacts.ruby, artifacts.rubySnapshot);
  }

  report.typescript = commandArtifact(artifacts.typescript, artifacts.typeScriptSnapshot ?? artifacts.typescriptSnapshot);

  return report;
}

function runQni(implementation, argv, cwd) {
  const command = implementation === 'ruby' ? 'bundle' : process.execPath;
  const args = implementation === 'ruby'
    ? ['exec', path.join(projectRoot, 'bin', 'qni'), ...argv]
    : [path.join(projectRoot, 'dist', 'bin', 'qni.js'), ...argv];
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: qniEnv(cwd),
    timeout: 120_000
  });

  return {
    command: implementation === 'ruby' ? `bundle exec bin/qni ${displayArgs(argv).join(' ')}` : `node dist/bin/qni.js ${displayArgs(argv).join(' ')}`,
    error: result.error?.message,
    exit_status: result.status,
    signal: result.signal,
    stderr: result.stderr,
    stdout: result.stdout
  };
}

function qniEnv(cwd) {
  const env = {
    ...process.env,
    BUNDLE_GEMFILE: path.join(projectRoot, 'Gemfile'),
    PWD: cwd
  };
  delete env.QNI_USE_RUBY;
  return env;
}

function writeInitialFiles(dir, testCase) {
  if (testCase.circuit) {
    fs.writeFileSync(path.join(dir, 'circuit.json'), `${JSON.stringify(testCase.circuit, null, 2)}\n`);
  }
}

function snapshot(dir, testCase) {
  return {
    circuit_json: circuitSnapshot(dir, testCase),
    files: Object.fromEntries((testCase.files ?? []).map((fileSpec) => [fileSpec.path, fileSnapshot(path.join(dir, fileSpec.path), fileSpec.type)]))
  };
}

function circuitSnapshot(dir, testCase) {
  if (!testCase.compareCircuit && !fs.existsSync(path.join(dir, 'circuit.json'))) {
    return undefined;
  }

  const filePath = path.join(dir, 'circuit.json');
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fileSnapshot(filePath, type) {
  if (!fs.existsSync(filePath)) {
    return { exists: false };
  }

  const bytes = fs.readFileSync(filePath);
  const base = {
    exists: true,
    sha256: sha256(bytes),
    size_bytes: bytes.length
  };

  if (type === 'png') {
    return {
      ...base,
      png: pngMetadata(bytes)
    };
  }

  return base;
}

function pngMetadata(bytes) {
  const signature = bytes.subarray(0, 8).toString('hex');
  let offset = 8;
  let width = 0;
  let height = 0;
  let color_type = null;
  let frame_count = 0;

  while (offset + 8 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    const dataOffset = offset + 8;

    if (type === 'IHDR') {
      width = bytes.readUInt32BE(dataOffset);
      height = bytes.readUInt32BE(dataOffset + 4);
      color_type = bytes[dataOffset + 9];
    }

    if (type === 'fcTL') {
      frame_count += 1;
    }

    offset = dataOffset + length + 4;
  }

  return { color_type, frame_count, height, signature, width };
}

function commandArtifact(command, snapshotData) {
  return {
    command: command.command,
    error: command.error,
    exit_status: command.exit_status,
    signal: command.signal,
    stderr: textDigest(command.stderr),
    stdout: textDigest(command.stdout),
    snapshot: snapshotData
  };
}

function textDigest(value) {
  return {
    preview: value.length > 500 ? `${value.slice(0, 500)}…` : value,
    sha256: sha256(Buffer.from(value)),
    size_bytes: Buffer.byteLength(value)
  };
}

function checkSucceeded(command) {
  return checkEqual('exit_status', 0, command.exit_status);
}

function checkIncludes(actual, expected) {
  if (!expected) {
    return { name: 'stdout_includes', passed: true };
  }

  return {
    actual: actual.includes(expected) ? expected : actual,
    expected,
    name: 'stdout_includes',
    passed: actual.includes(expected)
  };
}

function checkEqual(name, expected, actual) {
  const passed = JSON.stringify(expected) === JSON.stringify(actual);
  return passed ? { name, passed } : { actual, expected, name, passed };
}

function normalizeCliOutput(value) {
  return value.replace(/\s+$/u, '');
}

function commandOutput(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 30_000 });

  if (result.status !== 0 || result.error) {
    return result.error?.message ?? result.stderr.trim();
  }

  return result.stdout.trim();
}

function markdownReport(report) {
  const rows = report.cases
    .map((entry) => `| ${entry.name} | ${entry.mode} | ${entry.status} | \`${entry.command.replaceAll('|', '\\|')}\` |`)
    .join('\n');

  return `# Ruby 比較アーカイブ\n\n生成日時: ${report.generated_at}\n\nsource commit: ${report.source_commit}\n\nstatus: ${report.status}\n\n## Summary\n\n- total: ${report.summary.total}\n- passed: ${report.summary.passed}\n- failed: ${report.summary.failed}\n\n## Runtimes\n\n- Node.js: ${report.runtimes.node}\n- Ruby: ${report.runtimes.ruby}\n- TypeScript: ${report.runtimes.typescript}\n\n## Cases\n\n| name | mode | status | command |\n| --- | --- | --- | --- |\n${rows}\n\n詳細は \`docs/reports/ruby-comparison-archive.json\` を参照してください。\n`;
}

function qniCommandLine(argv) {
  return `qni ${displayArgs(argv).join(' ')}`;
}

function displayArgs(argv) {
  return argv.map((arg) => arg.replaceAll(projectRoot, '<repo>'));
}

function safeName(name) {
  return name.replace(/[^a-z0-9_-]/giu, '-');
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

main();
