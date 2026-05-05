#!/usr/bin/env node

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const harnessPath = path.join(projectRoot, 'dist', 'performance', 'comparison_harness.js');

const result = spawnSync('npm', ['run', 'build'], {
  cwd: projectRoot,
  stdio: 'inherit'
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}

const { main } = require(harnessPath);

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
