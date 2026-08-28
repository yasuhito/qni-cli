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
    const packed = packProject(tempRoot);
    assertPackedFiles(packed.files);

    const tarball = packed.tarball;
    const installRoot = path.join(tempRoot, 'install');
    const workspace = path.join(tempRoot, 'workspace');

    fs.mkdirSync(installRoot);
    fs.mkdirSync(workspace);

    run('npm init -y', 'npm', ['init', '-y'], { cwd: installRoot });
    run('npm install packed qni-cli', 'npm', ['install', '--omit=dev', '--ignore-scripts', tarball], { cwd: installRoot });

    const packageRoot = path.join(installRoot, 'node_modules', 'qni-cli');
    const env = smokeEnv({ installRoot });

    assertPackageMetadata(packageRoot);
    assertSkillContent(packageRoot);
    assertPiSkillDetection({ packageRoot, tempRoot });

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
      command: [path.join(packageRoot, 'skills', 'qni-cli', 'scripts', 'qni'), '--help'],
      cwd: workspace,
      env,
      label: 'bundled skill qni --help',
      stdoutIncludes: 'qni commands:'
    });
    assertSuperdenseCoding({ env, packageRoot, workspace });
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

    fs.writeFileSync(path.join(workspace, 'prompt.md'), 'Solve the smoke benchmark suite.\n');
    fs.writeFileSync(path.join(workspace, 'response.md'), 'I wrote the requested .qni submissions.\n');
    assertCommand({
      command: [
        'qni',
        'research',
        'record',
        '--collaborator',
        'package-smoke',
        '--benchmark',
        path.join(packageRoot, 'benchmarks', 'quantum-katas'),
        '--submissions',
        path.join(packageRoot, 'benchmarks', 'solutions', 'quantum-katas'),
        '--prompt',
        'prompt.md',
        '--response',
        'response.md',
        '--slug',
        'package-smoke'
      ],
      cwd: workspace,
      env,
      label: 'qni research record package smoke',
      stdoutIncludes: 'Recorded research trial: research/runs/'
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
  const packEntry = JSON.parse(result.stdout)[0];
  const filename = packEntry?.filename;

  if (!filename) {
    throw new Error(`npm pack did not report a filename:\n${result.stdout}`);
  }

  return {
    files: (packEntry.files ?? []).map((file) => file.path),
    tarball: path.join(tempRoot, filename)
  };
}

function assertPackedFiles(files) {
  const requiredFiles = [
    'LICENSE',
    'benchmarks/quantum-katas/basic-gates/state-flip.md',
    'dist/bin/qni.js',
    'examples/superdense-coding/circuit.qni',
    'libexec/qni_symbolic_run.py',
    'scripts/setup_symbolic_python.sh',
    'skills/qni-cli/SKILL.md',
    'skills/qni-cli/scripts/qni'
  ];

  for (const requiredFile of requiredFiles) {
    if (!files.includes(requiredFile)) {
      throw new Error(`packed qni-cli is missing ${requiredFile}`);
    }
  }
}

function assertPackageMetadata(packageRoot) {
  const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));

  if (manifest.name !== 'qni-cli' || manifest.version !== '0.1.0' || manifest.private === true) {
    throw new Error('packed qni-cli has invalid publication identity');
  }
  if (manifest.bin?.qni !== './dist/bin/qni.js' || manifest.license !== 'MIT') {
    throw new Error('packed qni-cli has invalid command or license metadata');
  }
  if (!manifest.keywords?.includes('pi-package') || !manifest.pi?.skills?.includes('./skills/qni-cli')) {
    throw new Error('packed qni-cli does not declare its Pi skill');
  }
}

function assertSkillContent(packageRoot) {
  const skillRoot = path.join(packageRoot, 'skills', 'qni-cli');
  const skillFiles = [
    path.join(skillRoot, 'SKILL.md'),
    path.join(skillRoot, 'references', 'recipes.md'),
    path.join(skillRoot, 'references', 'superdense-coding.md')
  ];
  const content = skillFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n').toLowerCase();

  for (const removedRuntimeReference of ['bundle exec', 'bundler', '/home/yasuhito/work/qni-cli', 'ruby']) {
    if (content.includes(removedRuntimeReference)) {
      throw new Error(`packed qni-cli skill references removed runtime: ${removedRuntimeReference}`);
    }
  }
}

function assertPiSkillDetection({ packageRoot, tempRoot }) {
  const agentDir = path.join(tempRoot, 'pi-agent');
  const homeDir = path.join(tempRoot, 'pi-home');
  fs.mkdirSync(agentDir);
  fs.mkdirSync(homeDir);
  const env = { ...process.env, HOME: homeDir, PI_CODING_AGENT_DIR: agentDir, PI_OFFLINE: '1' };

  run('pi install packed qni-cli', 'pi', ['install', packageRoot], { cwd: tempRoot, env });
  const rpc = run('pi package skill discovery', 'pi', [
    '--mode', 'rpc', '--offline', '--no-session', '--no-tools', '--no-context-files',
    '--no-extensions', '--no-prompt-templates', '--no-themes'
  ], {
    cwd: tempRoot,
    env,
    input: '{"type":"get_commands","id":"package-smoke"}\n'
  });
  const response = rpc.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .find((entry) => entry.id === 'package-smoke');
  const commands = response?.data?.commands ?? [];
  const qniSkill = commands.find((command) => command.name === 'skill:qni-cli');

  if (!qniSkill || qniSkill.sourceInfo?.origin !== 'package') {
    throw new Error(`Pi did not detect the packed qni-cli skill:\n${rpc.stdout}`);
  }
}

function assertSuperdenseCoding({ env, packageRoot, workspace }) {
  fs.rmSync(path.join(workspace, 'circuit.json'), { force: true });
  const commands = fs.readFileSync(
    path.join(packageRoot, 'examples', 'superdense-coding', 'circuit.qni'),
    'utf8'
  ).trim().split('\n');

  for (const command of commands) {
    const [executable, ...args] = command.split(/\s+/u);
    run(`superdense coding: ${command}`, executable, args, { cwd: workspace, env });
  }

  const result = run('qni superdense coding package smoke', 'qni', ['run', '--shots', '16', '--seed', '42', '--json'], {
    cwd: workspace,
    env
  });
  const measurement = JSON.parse(result.stdout);

  if (measurement.results.length !== 4) {
    throw new Error(`superdense coding did not produce all four inputs:\n${result.stdout}`);
  }
  for (const row of measurement.results) {
    if (row.values.input_high !== row.values.output_high || row.values.input_low !== row.values.output_low) {
      throw new Error(`superdense coding input did not match output:\n${result.stdout}`);
    }
  }
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
    input: options.input,
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
