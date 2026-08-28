const assert = require('node:assert/strict');
const path = require('node:path');

const { Given, Then, When } = require('@cucumber/cucumber');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

Given('偽の Pi ExtensionAPI に数式描画拡張を登録する', function () {
  const extensionModule = require(path.join(PROJECT_ROOT, 'dist', 'qni-math', 'index.js'));
  const commands = new Map();

  extensionModule.default({
    registerCommand(name, options) {
      commands.set(name, options);
    }
  });

  this.qniMathCommands = commands;
});

When('`\\/math status` を実行する', async function () {
  const command = this.qniMathCommands.get('math');
  assert.ok(command, 'expected qni-math to register /math');

  this.qniMathWidgets = [];
  await command.handler('status', {
    ui: {
      setWidget: (key, lines, options) => this.qniMathWidgets.push({ key, lines, options })
    }
  });
});

Then('Pi の状態表示にパッケージの版と固定のテキスト経路がある', function () {
  const manifest = require(path.join(PROJECT_ROOT, 'package.json'));

  assert.deepEqual(this.qniMathWidgets, [
    {
      key: 'qni-math-status',
      lines: [`qni-math ${manifest.version}`, 'path: text (fixed)'],
      options: { placement: 'belowEditor' }
    }
  ]);
});
