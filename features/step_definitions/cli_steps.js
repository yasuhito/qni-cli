const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

const { Then, When } = require('@cucumber/cucumber');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const QNI_BIN = path.join(PROJECT_ROOT, 'bin', 'qni');

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

function bundlerEnv() {
  return {
    ...process.env,
    BUNDLE_GEMFILE: path.join(PROJECT_ROOT, 'Gemfile')
  };
}

function runQniCommand(scenarioDir, command) {
  const argv = splitCommand(command);

  if (argv[0] !== 'qni') {
    throw new Error(`command must start with qni: ${command}`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn('bundle', ['exec', QNI_BIN, ...argv.slice(1)], {
      cwd: scenarioDir,
      env: bundlerEnv()
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

function normalizeMultilineText(value) {
  return value
    .replace(/\n+$/u, '')
    .split('\n')
    .map((line) => line.replace(/\s+$/u, ''))
    .join('\n');
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

When('{string} を実行', async function (command) {
  this.lastCommand = await runQniCommand(this.scenarioDir, command);
});

Then('コマンドは成功', function () {
  assert.equal(this.lastCommand.code, 0, commandFailureMessage(this.lastCommand));
});

Then('{string} の内容:', function (filePath, docString) {
  assert.equal(this.lastCommand.code, 0, commandFailureMessage(this.lastCommand));

  const actualPath = path.join(this.scenarioDir, filePath);
  assert.ok(fs.existsSync(actualPath), `expected file to exist: ${filePath}`);

  const actual = JSON.parse(fs.readFileSync(actualPath, 'utf8'));
  const expected = JSON.parse(docString);
  assert.deepEqual(actual, expected);
});

Then('回路図:', function (docString) {
  assert.equal(this.lastCommand.code, 0, commandFailureMessage(this.lastCommand));

  assert.equal(
    normalizeMultilineText(this.lastCommand.stdout),
    normalizeMultilineText(docString)
  );
});

Then('標準出力:', function (docString) {
  assert.equal(this.lastCommand.code, 0, commandFailureMessage(this.lastCommand));

  assert.equal(
    normalizeMultilineText(this.lastCommand.stdout),
    normalizeMultilineText(docString)
  );
});

Then('コマンドは失敗して標準エラー:', function (docString) {
  assert.notEqual(this.lastCommand.code, 0, commandSuccessMessage(this.lastCommand));

  assert.equal(
    normalizeMultilineText(this.lastCommand.stderr),
    normalizeMultilineText(docString)
  );
});
