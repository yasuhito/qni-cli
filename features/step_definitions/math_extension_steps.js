const assert = require('node:assert/strict');
const path = require('node:path');

const { Given, Then, When } = require('@cucumber/cucumber');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const APC = '\x1b_G';
const PLACEHOLDER = String.fromCodePoint(0x10eeee);

Given('偽の Pi ExtensionAPI に数式描画拡張を登録する', function () {
  const extensionModule = require(path.join(PROJECT_ROOT, 'dist', 'qni-math', 'index.js'));
  const commands = new Map();
  let sessionStart;
  let transformer;

  extensionModule.default({
    on(event, handler) {
      if (event === 'session_start') sessionStart = handler;
    },
    registerCommand(name, options) {
      commands.set(name, options);
    },
    registerMarkdownTransformer(registered) {
      transformer = registered;
    }
  });

  assert.ok(transformer, 'expected qni-math to register a Markdown transformer');
  assert.ok(sessionStart, 'expected qni-math to observe session startup');
  sessionStart({}, {
    ui: {
      theme: { getFgAnsi: () => '\x1b[38;2;212;212;212m' },
      setStatus() {}
    }
  });
  this.qniMathCommands = commands;
  this.qniMathTransformer = transformer;
});

function transform(world, markdown, messageType = 'assistant') {
  world.qniMathSource = markdown;
  world.qniMathMarkdown = world.qniMathTransformer(markdown, {
    messageType,
    isStreaming: false,
    availableWidth: 80
  });
}

When(/^`\$\\ket\{0\}\$` を含む本文を画像経路で変換する$/, function () {
  transform(this, '状態は $\\ket{0}$ です。');
});

When('表示数式とインライン数式を含む本文を画像経路で変換する', function () {
  transform(this, '状態は $\\ket{0}$ です。\n\n$$\\frac{1}{\\sqrt 2}(\\ket{00}+\\ket{11})$$');
});

When('4 種類の数式区切りを含む本文を画像経路で変換する', function () {
  transform(this, '$x$ と $$y$$ と \\(z\\) と \\[w\\]');
});

When('2 つの数式を含む本文を画像経路で変換する', function () {
  transform(this, '$\\ket{0}$ と $\\ket{1}$');
});

When('コードと通常の数式を含む本文を画像経路で変換する', function () {
  transform(this, '```text\n$not-math$\n```\n`$also-code$` と $\\ket{0}$');
});

When('引用内のコードフェンスを含む本文を画像経路で変換する', function () {
  transform(this, '> ```text\n> $quoted-code$\n> ```\n\n$\\ket{0}$');
});

When('thinking ブロックの本文を画像経路で変換する', function () {
  transform(this, '考える: $\\ket{0}$', 'assistant-thinking');
});

When(/^`\\ket\{\\Phi\^\+\}=\\frac\{\\ket\{00\}\+\\ket\{11\}\}\{\\sqrt 2\}` を画像経路で変換する$/, function () {
  transform(this, '$$\\ket{\\Phi^+}=\\frac{\\ket{00}+\\ket{11}}{\\sqrt 2}$$');
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

Then('変換後の Markdown の先頭行に画像転送がある', function () {
  const transferLine = this.qniMathMarkdown.split('\n')[0];
  assert.match(transferLine, /^\x1b_Ga=t,f=100,q=2,i=\d+;/);
});

Then('変換後のプレースホルダーは前景色だけを使う', function () {
  assert.deepEqual({
    hasForeground: /\x1b\[38;2;\d+;\d+;\d+m/u.test(this.qniMathMarkdown),
    hasUnderline: /\x1b\[58;/u.test(this.qniMathMarkdown),
    hasPlaceholder: this.qniMathMarkdown.includes(PLACEHOLDER)
  }, { hasForeground: true, hasUnderline: false, hasPlaceholder: true });
});

Then('表示数式は独立した複数行に配置される', function () {
  const displayLines = this.qniMathMarkdown
    .split('\n')
    .slice(1)
    .filter((line) => line.startsWith('\x1b[38;2;'));
  assert.ok(displayLines.length >= 2 && displayLines.every((line) => line.includes(PLACEHOLDER)));
});

Then('インライン数式は本文中の 1 行に配置される', function () {
  const inlineLine = this.qniMathMarkdown.split('\n').find((line) => line.includes('状態は'));
  assert.ok(inlineLine?.includes(PLACEHOLDER));
});

Then('4 つの数式が画像配置になる', function () {
  const transferLine = this.qniMathMarkdown.split('\n')[0];
  assert.equal((transferLine.match(/a=t,f=100/g) ?? []).length, 4);
});

Then('変換後の Markdown の転送行は 1 行だけになる', function () {
  const linesWithTransfers = this.qniMathMarkdown
    .split('\n')
    .filter((line) => line.includes(APC));
  assert.equal(linesWithTransfers.length, 1);
});

Then('コードフェンス内の数式は残る', function () {
  assert.ok(this.qniMathMarkdown.includes('$not-math$'));
});

Then('インラインコード内の数式は残る', function () {
  assert.ok(this.qniMathMarkdown.includes('`$also-code$`'));
});

Then('コード外の数式は画像配置になる', function () {
  assert.ok(this.qniMathMarkdown.includes(PLACEHOLDER));
});

Then('引用内のコードフェンスにある数式は残る', function () {
  assert.ok(this.qniMathMarkdown.includes('$quoted-code$'));
});

Then('thinking ブロックの本文は変更されない', function () {
  assert.equal(this.qniMathMarkdown, this.qniMathSource);
});

Then('Bell 状態は設定なしで画像配置になる', function () {
  assert.ok(this.qniMathMarkdown.includes(PLACEHOLDER));
});

Then('Pi の状態表示にパッケージの版と固定の画像経路がある', function () {
  const manifest = require(path.join(PROJECT_ROOT, 'package.json'));

  assert.deepEqual(this.qniMathWidgets, [
    {
      key: 'qni-math-status',
      lines: [`qni-math ${manifest.version}`, 'path: image (fixed)'],
      options: { placement: 'belowEditor' }
    }
  ]);
});
