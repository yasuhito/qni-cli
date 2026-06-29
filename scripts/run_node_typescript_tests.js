#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const testFiles = [
  'add_command.test.js',
  'benchmark_command.test.js',
  'circuit_file.test.js',
  'clear_command.test.js',
  'expect_command.test.js',
  'gate_command.test.js',
  'help_command.test.js',
  'remove_command.test.js',
  'state_command.test.js',
  'symbolic_state_renderer.test.js',
  'variable_command.test.js'
].map((file) => path.join('tmp', 'typescript-tests', 'test', 'typescript', file));

const result = spawnSync(process.execPath, ['--test', ...testFiles], {
  cwd: path.resolve(__dirname, '..'),
  env: process.env,
  stdio: 'inherit'
});

if (result.error) {
  console.error(result.error.message);
  process.exit(127);
}

if (result.signal) {
  console.error(`node --test terminated with signal ${result.signal}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
