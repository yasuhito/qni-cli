#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const keepTemp = process.env.QNI_KEEP_PACKAGE_SMOKE === '1';

function main() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'qni-cli-package-smoke-'));

  try {
    const tarball = packProject(tempRoot);
    const installRoot = path.join(tempRoot, 'install');
    const workspace = path.join(tempRoot, 'workspace');

    fs.mkdirSync(installRoot);
    fs.mkdirSync(workspace);

    run('npm init -y', 'npm', ['init', '-y'], { cwd: installRoot });
    run('npm install packed qni-cli', 'npm', ['install', '--omit=dev', '--ignore-scripts', tarball], { cwd: installRoot });

    const packageRoot = path.join(installRoot, 'node_modules', 'qni-cli');
    const env = smokeEnv({ installRoot });

    assertCommand({
      command: ['qni', '--help'],
      cwd: workspace,
      env,
      label: 'qni --help',
      stdoutIncludes: 'qni commands:'
    });
    assertCommand({
      command: ['qni', 'add', 'H', '--qubit', '0', '--step', '0'],
      cwd: workspace,
      env,
      label: 'qni add H --qubit 0 --step 0'
    });
    assertCommand({
      command: ['qni', 'run'],
      cwd: workspace,
      env,
      label: 'qni run',
      stdoutIncludes: '0.7071067811865475,0.7071067811865475'
    });
    assertCommand({
      command: ['qni', 'expect', 'Z'],
      cwd: workspace,
      env,
      label: 'qni expect Z',
      stdoutIncludes: 'Z=0.0'
    });
    assertCommand({
      command: [
        'qni',
        'benchmark',
        'run',
        path.join(packageRoot, 'benchmarks', 'quantum-katas', 'basic-gates', 'state-flip.md'),
        path.join(packageRoot, 'benchmarks', 'solutions', 'quantum-katas', 'basic-gates', 'state-flip.qni')
      ],
      cwd: workspace,
      env,
      label: 'qni benchmark run StateFlip',
      stdoutIncludes: 'PASS StateFlip'
    });

    console.log(`package smoke passed: ${path.basename(tarball)}`);
  } finally {
    if (keepTemp) {
      console.log(`kept package smoke temp dir: ${tempRoot}`);
    } else {
      fs.rmSync(tempRoot, { force: true, recursive: true });
    }
  }
}

function packProject(tempRoot) {
  const result = run('npm pack', 'npm', ['pack', '--json', '--pack-destination', tempRoot], { cwd: projectRoot });
  const packEntries = JSON.parse(result.stdout);
  const filename = packEntries[0]?.filename;

  if (!filename) {
    throw new Error(`npm pack did not report a filename:\n${result.stdout}`);
  }

  return path.join(tempRoot, filename);
}

function smokeEnv({ installRoot }) {
  return {
    ...process.env,
    PATH: [path.join(installRoot, 'node_modules', '.bin'), process.env.PATH ?? ''].join(path.delimiter)
  };
}

function assertCommand({ command, cwd, env, label, stdoutIncludes }) {
  const [executable, ...args] = command;
  const result = run(label, executable, args, { cwd, env });

  if (stdoutIncludes && !result.stdout.includes(stdoutIncludes)) {
    throw new Error([
      `${label} stdout did not include expected text`,
      `expected: ${stdoutIncludes}`,
      'stdout:',
      result.stdout,
      'stderr:',
      result.stderr
    ].join('\n'));
  }
}

function run(label, command, args, options) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    env: options.env ?? process.env,
    timeout: 120_000
  });

  if (result.error) {
    throw new Error(`${label} failed to start: ${result.error.message}`);
  }

  if (result.signal) {
    throw new Error(`${label} terminated with signal ${result.signal}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit status ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }

  return {
    stderr: result.stderr,
    stdout: result.stdout
  };
}

main();
