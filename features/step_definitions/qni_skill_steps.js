const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const { Then } = require('@cucumber/cucumber');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const NODE_QNI_BIN = path.join(PROJECT_ROOT, 'dist', 'bin', 'qni.js');
const COMMAND_REFERENCE = path.join(PROJECT_ROOT, 'skills', 'qni-cli', 'references', 'commands.md');

function unquoteCode(text) {
  const match = text.trim().match(/^`([^`]+)`$/u);
  assert.ok(match, `expected an inline-code command, got: ${text}`);
  return match[1];
}

function inlineCodeValues(text) {
  return [...text.matchAll(/`([^`]+)`/gu)].map((match) => match[1]);
}

function commandReferenceRows(markdown) {
  const section = markdown.split('## コマンドとオプション\n\n')[1]?.split('\n## ')[0];
  assert.ok(section, 'expected a "コマンドとオプション" section');

  const rows = section
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .slice(2)
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()));

  assert.ok(rows.length > 0, 'expected command reference table rows');
  return rows;
}

Then('qni スキルのコマンド仕様にある名前とオプションは CLI ヘルプに存在する', function () {
  assert.ok(fs.existsSync(COMMAND_REFERENCE), `expected command reference: ${COMMAND_REFERENCE}`);
  const markdown = fs.readFileSync(COMMAND_REFERENCE, 'utf8');

  for (const [commandCell, optionCell] of commandReferenceRows(markdown)) {
    const command = unquoteCode(commandCell);
    const commandWords = command.split(/\s+/u);
    const helpWords = commandWords.slice(0, 2);
    const stdout = execFileSync(process.execPath, [NODE_QNI_BIN, ...helpWords.slice(1), '--help'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8'
    });

    for (const documentedName of [command, ...inlineCodeValues(optionCell)]) {
      assert.ok(
        stdout.includes(documentedName),
        `expected "${documentedName}" from ${COMMAND_REFERENCE} in "${helpWords.join(' ')} --help"`
      );
    }
  }
});
