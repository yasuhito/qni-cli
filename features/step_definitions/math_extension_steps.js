const assert = require('node:assert/strict');
const path = require('node:path');

const { Given, Then, When } = require('@cucumber/cucumber');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const APC = '\x1b_G';
const PLACEHOLDER = String.fromCodePoint(0x10eeee);

function registerMathExtension(world, pathSetting) {
  const extensionModule = require(path.join(PROJECT_ROOT, 'dist', 'qni-math', 'index.js'));
  const commands = new Map();
  let sessionStart;
  let transformer;
  const previousPath = process.env.QNI_MATH_PATH;

  if (pathSetting === undefined) delete process.env.QNI_MATH_PATH;
  else process.env.QNI_MATH_PATH = pathSetting;
  try {
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
  } finally {
    if (previousPath === undefined) delete process.env.QNI_MATH_PATH;
    else process.env.QNI_MATH_PATH = previousPath;
  }

  assert.ok(transformer, 'expected qni-math to register a Markdown transformer');
  assert.ok(sessionStart, 'expected qni-math to observe session startup');
  sessionStart({}, {
    ui: {
      theme: { getFgAnsi: () => '\x1b[38;2;212;212;212m' },
      setStatus() {}
    }
  });
  world.qniMathCommands = commands;
  world.qniMathTransformer = transformer;
}

Given('偽の Pi ExtensionAPI に数式描画拡張を登録する', function () {
  registerMathExtension(this);
});

Given('テキスト経路で偽の Pi ExtensionAPI に数式描画拡張を登録する', function () {
  registerMathExtension(this, 'text');
});

function transform(world, markdown, options = {}) {
  world.qniMathSource = markdown;
  world.qniMathMarkdown = world.qniMathTransformer(markdown, {
    messageType: options.messageType ?? 'assistant',
    isStreaming: options.isStreaming ?? false,
    availableWidth: options.availableWidth ?? 80
  });
}

function imagePlacement(markdown) {
  const placement = markdown.match(/a=p,U=1,q=2,i=(\d+),p=\d+,c=(\d+),r=(\d+)/u);
  assert.ok(placement, 'expected an image placement');
  return { id: Number(placement[1]), columns: Number(placement[2]), rows: Number(placement[3]) };
}

function mathCommand(world) {
  const command = world.qniMathCommands.get('math');
  assert.ok(command, 'expected qni-math to register /math');
  return command;
}

async function captureMathStatus(world) {
  world.qniMathWidgets = [];
  await mathCommand(world).handler('status', {
    ui: { setWidget: (key, lines, options) => world.qniMathWidgets.push({ key, lines, options }) }
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
  transform(this, '考える: $\\ket{0}$', { messageType: 'assistant-thinking' });
});

When(/^ストリーミング中に `状態 \$\\frac\{1\}\{\\sqrt 2\}` まで届いた本文を変換する$/, function () {
  transform(this, '状態 $\\frac{1}{\\sqrt 2}', { isStreaming: true });
});

When('同じ数式を 2 回変換する', function () {
  transform(this, '状態は $\\ket{0}$ です。');
  this.qniMathFirstPlacement = imagePlacement(this.qniMathMarkdown);
  transform(this, '状態は $\\ket{0}$ です。');
  this.qniMathSecondPlacement = imagePlacement(this.qniMathMarkdown);
});

When('長い表示数式を異なる利用可能幅で変換する', function () {
  const markdown = '$$\\frac{1}{\\sqrt 2}(\\ket{00000000}+\\ket{11111111})$$';
  transform(this, markdown, { availableWidth: 80 });
  this.qniMathWidePlacement = imagePlacement(this.qniMathMarkdown);
  transform(this, markdown, { availableWidth: 8 });
  this.qniMathNarrowPlacement = imagePlacement(this.qniMathMarkdown);
});

When('不正な数式と正しい数式を含む本文を変換する', function () {
  transform(this, '$\\frac{$ と $\\ket{0}$');
});

When('数式を変換して `\\/math clear` のあと `\\/math status` を実行する', async function () {
  transform(this, '$\\ket{0}$');
  await mathCommand(this).handler('clear', { ui: { notify() {} } });
  await captureMathStatus(this);
});

When(/^`\\ket\{\\Phi\^\+\}=\\frac\{\\ket\{00\}\+\\ket\{11\}\}\{\\sqrt 2\}` を画像経路で変換する$/, function () {
  transform(this, '$$\\ket{\\Phi^+}=\\frac{\\ket{00}+\\ket{11}}{\\sqrt 2}$$');
});

When('`\\/math status` を実行する', async function () {
  await captureMathStatus(this);
});

When(/^`\$\\ket\{\\psi\}\$` を含む本文を変換する$/, function () {
  transform(this, '状態は $\\ket{\\psi}$ です。');
});

When(/^`\$\\bra\{0\}\$` を含む本文を変換する$/, function () {
  transform(this, '状態は $\\bra{0}$ です。');
});

When(/^`\$\\braket\{0\}\{1\}\$` を含む本文を変換する$/, function () {
  transform(this, '内積は $\\braket{0}{1}$ です。');
});

When(/^引数の前に改行がある `\\ket` を含む表示数式を変換する$/, function () {
  transform(this, '$$\\ket\n{0}$$');
});

When(/^`\$\\ket\{\\psi\} \\otimes \\ket\{0\}\$` を含む本文を変換して Pi の Markdown 部品で描く$/, function () {
  transform(this, '$\\ket{\\psi} \\otimes \\ket{0}$');
  const { Markdown } = require('@earendil-works/pi-tui');
  const identity = (text) => text;
  const theme = {
    heading: identity,
    link: identity,
    linkUrl: identity,
    code: identity,
    codeBlock: identity,
    codeBlockBorder: identity,
    quote: identity,
    quoteBorder: identity,
    hr: identity,
    listBullet: identity,
    bold: identity,
    italic: identity,
    strikethrough: identity,
    underline: identity
  };
  this.qniMathRenderedLines = new Markdown(this.qniMathMarkdown, 0, 0, theme).render(80);
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

Then('未完成な数式は原文のまま返る', function () {
  assert.equal(this.qniMathMarkdown, '状態 $\\frac{1}{\\sqrt 2}');
});

Then('2 回の変換で同じ画像 ID が使われる', function () {
  assert.equal(this.qniMathFirstPlacement.id, this.qniMathSecondPlacement.id);
});

Then('表示数式の列数が変わる', function () {
  assert.notEqual(this.qniMathWidePlacement.columns, this.qniMathNarrowPlacement.columns);
});

Then('転送画像 ID が変わる', function () {
  assert.notEqual(this.qniMathWidePlacement.id, this.qniMathNarrowPlacement.id);
});

Then('不正な数式は原文のまま残る', function () {
  assert.ok(this.qniMathMarkdown.includes('$\\frac{$'));
});

Then('正しい数式は画像になる', function () {
  assert.equal((this.qniMathMarkdown.match(/a=t,f=100/g) ?? []).length, 1);
});

Then('Pi の状態表示にキャッシュ件数 0 がある', function () {
  const lines = this.qniMathWidgets.flatMap((widget) => widget.lines);
  assert.ok(lines.includes('cache: 0 entries, 0 bytes'));
});

Then('Pi の状態表示にパッケージの版と固定の画像経路がある', function () {
  const manifest = require(path.join(PROJECT_ROOT, 'package.json'));
  assert.equal(this.qniMathWidgets.length, 1);
  assert.equal(this.qniMathWidgets[0].key, 'qni-math-status');
  assert.deepEqual(this.qniMathWidgets[0].lines.slice(0, 2), [
    `qni-math ${manifest.version}`,
    'path: image (fixed)'
  ]);
  assert.deepEqual(this.qniMathWidgets[0].options, { placement: 'belowEditor' });
});

Then(/^変換後の Markdown は `\$\|\\psi\\rangle\$` を含む$/, function () {
  assert.ok(this.qniMathMarkdown.includes('$|\\psi\\rangle$'));
});

Then(/^変換後の Markdown は `\$\\langle 0\|\$` を含む$/, function () {
  assert.ok(this.qniMathMarkdown.includes('$\\langle 0|$'));
});

Then(/^変換後の Markdown は `\$\\langle 0\|1\\rangle\$` を含む$/, function () {
  assert.ok(this.qniMathMarkdown.includes('$\\langle 0|1\\rangle$'));
});

Then(/^変換後の Markdown は `\|0\\rangle` を含む$/, function () {
  assert.ok(this.qniMathMarkdown.includes('|0\\rangle'));
});

Then(/^描画された行は `\|ψ⟩ ⊗ \|0⟩` を含む$/, function () {
  assert.ok(this.qniMathRenderedLines.some((line) => line.includes('|ψ⟩ ⊗ |0⟩')));
});

Then(/^描画された行に `\\ket` はない$/, function () {
  assert.ok(this.qniMathRenderedLines.every((line) => !line.includes('\\ket')));
});

Then('変換後の Markdown に画像転送はない', function () {
  assert.ok(!this.qniMathMarkdown.includes(APC));
});

Then('変換後の Markdown に画像プレースホルダーはない', function () {
  assert.ok(!this.qniMathMarkdown.includes(PLACEHOLDER));
});

Then('Pi の状態表示に固定のテキスト経路がある', function () {
  const lines = this.qniMathWidgets.flatMap((widget) => widget.lines);
  assert.ok(lines.includes('path: text (fixed)'));
});
