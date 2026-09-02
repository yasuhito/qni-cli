const assert = require('node:assert/strict');
const { Given, Then, When } = require('@cucumber/cucumber');
const { registerMathExtension } = require('../support/qni_math_extension');

const APC = '\x1b_G';
const PLACEHOLDER = String.fromCodePoint(0x10eeee);

Given('偽の Pi ExtensionAPI に数式描画拡張を登録する', async function () {
  await registerMathExtension(this);
});

Given('薄い本文色で数式描画拡張を起動する', async function () {
  await registerMathExtension(this, { textColor: '\x1b[38;2;87;86;83m' });
});

Given('テキスト経路で偽の Pi ExtensionAPI に数式描画拡張を登録する', async function () {
  await registerMathExtension(this);
  await mathCommand(this).handler('text', { ui: { notify() {} } });
});

Given('PNG 問い合わせに `OK` を返す偽の端末で数式描画拡張を起動する', async function () {
  await registerMathExtension(this, { response: 'OK' });
});

Given('PNG 問い合わせに `EINVAL: unsupported format` を返す偽の端末で数式描画拡張を起動する', async function () {
  await registerMathExtension(this, { response: 'EINVAL: unsupported format' });
});

Given('PNG 問い合わせに応答しない偽の端末で数式描画拡張を起動する', async function () {
  await registerMathExtension(this, { response: null });
});

Given('`TMUX` が設定された偽の端末で数式描画拡張を起動する', async function () {
  await registerMathExtension(this, { tmux: true });
});

Given('`TERM=screen` が設定された偽の端末で数式描画拡張を起動する', async function () {
  await registerMathExtension(this, { term: 'screen' });
});

Given(/^`\\op` を `\\hat\{#1\}` に展開する環境変数で数式描画拡張を起動する$/, async function () {
  await registerMathExtension(this, {
    envMacros: JSON.stringify({ op: ['\\hat{#1}', 1] })
  });
});

Given(/^`\\op` を `\\hat\{#1\}` に展開する設定ファイルでテキスト経路を起動する$/, async function () {
  await registerMathExtension(this, { configMacros: { op: ['\\hat{#1}', 1] } });
  await mathCommand(this).handler('text', { ui: { notify() {} } });
});

Given(/^`\\op` の定義が異なる環境変数と設定ファイルでテキスト経路を起動する$/, async function () {
  await registerMathExtension(this, {
    configMacros: { op: ['\\hat{#1}', 1] },
    envMacros: JSON.stringify({ op: ['\\widetilde{#1}', 1] })
  });
  await mathCommand(this).handler('text', { ui: { notify() {} } });
});

Given('壊れた JSON の利用者マクロで数式描画拡張を起動する', async function () {
  await registerMathExtension(this, { envMacros: '{broken' });
});

Given('1 引数なのに `#2` を参照する利用者マクロで数式描画拡張を起動する', async function () {
  await registerMathExtension(this, {
    envMacros: JSON.stringify({ op: ['\\hat{#2}', 1] })
  });
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
  const placement = markdown.match(/a=T,f=100,q=2,U=1,i=(\d+),p=\d+,c=(\d+),r=(\d+)/u)
    ?? markdown.match(/a=p,U=1,q=2,i=(\d+),p=\d+,c=(\d+),r=(\d+)/u);
  assert.ok(placement, 'expected an image placement');
  return { id: Number(placement[1]), columns: Number(placement[2]), rows: Number(placement[3]) };
}

function transferredPng(markdown) {
  const chunks = Array.from(markdown.matchAll(/\x1b_G([^;]+);([A-Za-z0-9+/=]*)\x1b\\/gu))
    .filter((match) => !match[1].includes('a=p'))
    .map((match) => match[2]);
  assert.ok(chunks.length > 0, 'expected PNG transfer chunks');
  return Buffer.from(chunks.join(''), 'base64');
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

When(/^`\$x\$` を含む本文を画像経路で変換する$/, function () {
  transform(this, '値は $x$ です。');
});

When(/^`\$\$x\$\$` を含む本文を画像経路で変換する$/, function () {
  transform(this, '$$x$$');
});

When(/^`\\\(x\\\)` を含む本文を画像経路で変換する$/, function () {
  transform(this, '値は \\(x\\) です。');
});

When(/^`\$\\op\{H\}\$` を含む本文を画像経路で変換する$/, function () {
  transform(this, '$\\op{H}$');
});

When(/^`\$\\op\{H\}\$` を含む本文を変換する$/, function () {
  transform(this, '$\\op{H}$');
});

When('表示数式とインライン数式を含む本文を画像経路で変換する', function () {
  transform(this, '値は $x$ です。\n\n$$\\frac{1}{\\sqrt 2}(\\ket{00}+\\ket{11})$$');
});

When('単純な表示数式を端末セルに組版する', function () {
  const { getCellDimensions } = require('@earendil-works/pi-tui');
  const { typesetMath } = require('../../dist/qni-math/typesetter.js');
  this.qniMathCell = getCellDimensions();
  this.qniMathTypesetImage = typesetMath('x', '#100f0f', 80, this.qniMathCell);
});

When('背の高いインライン数式を画像経路で変換する', function () {
  transform(this, 'Bell 状態は $\\frac{\\ket{00}+\\ket{11}}{\\sqrt 2}$ です。');
});

When('Pauli 相関のインライン数式を画像経路で変換する', function () {
  transform(this, '相関は $\\langle ZZ\\rangle=1$ です。');
});

When('4 種類の数式区切りを含む本文を画像経路で変換する', function () {
  transform(this, '$x$ と $$y$$ と \\(z\\) と \\[w\\]');
});

When('2 つの数式を含む本文を画像経路で変換する', function () {
  transform(this, '$$x$$\n\n$$y$$');
});

When('コードと通常の数式を含む本文を画像経路で変換する', function () {
  transform(this, '```text\n$not-math$\n```\n`$also-code$`\n\n$$x$$');
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
  transform(this, '$$x$$');
  this.qniMathFirstPlacement = imagePlacement(this.qniMathMarkdown);
  transform(this, '$$x$$');
  this.qniMathSecondPlacement = imagePlacement(this.qniMathMarkdown);
});

When('本文色を濃くして同じ数式を再変換する', function () {
  transform(this, '$$x$$');
  this.qniMathFirstPlacement = imagePlacement(this.qniMathMarkdown);
  this.qniMathSetTextColor('\x1b[38;2;16;15;15m');
  transform(this, '$$x$$');
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
  transform(this, '$\\frac{$\n\n$$x$$');
});

When('数式を変換して `\\/math clear` のあと `\\/math status` を実行する', async function () {
  transform(this, '$\\ket{0}$');
  await mathCommand(this).handler('clear', { ui: { notify() {} } });
  await captureMathStatus(this);
});

When(/^`\\ket\{\\Phi\^\+\}=\\frac\{\\ket\{00\}\+\\ket\{11\}\}\{\\sqrt 2\}` を画像経路で変換する$/, function () {
  transform(this, '$$\\ket{\\Phi^+}=\\frac{\\ket{00}+\\ket{11}}{\\sqrt 2}$$');
});

function typesetExpectedMacro(world, actual, expected) {
  const { getCellDimensions } = require('@earendil-works/pi-tui');
  const { typesetMath } = require('../../dist/qni-math/typesetter.js');
  const cell = getCellDimensions();
  const renderedSvg = (latex) => typesetMath(latex, '#100f0f', 80, cell).svg
    .replace(/(<g data-mml-node="math") data-latex="[^"]*"/u, '$1');
  world.qniMathActualMacroSvg = renderedSvg(actual);
  world.qniMathExpectedMacroSvg = renderedSvg(expected);
}

When(/^`\\braket\{s\|\\psi\} - \\ket\{\\psi\}` を組版する$/, function () {
  typesetExpectedMacro(
    this,
    '\\braket{s|\\psi} - \\ket{\\psi}',
    '\\left\\langle s|\\psi\\right\\rangle - \\left|\\psi\\right\\rangle'
  );
});

When(/^`\\ket\{\\psi\}` を組版する$/, function () {
  typesetExpectedMacro(this, '\\ket{\\psi}', '\\left|\\psi\\right\\rangle');
});

When(/^`\\bra\{s\}` を組版する$/, function () {
  typesetExpectedMacro(this, '\\bra{s}', '\\left\\langle s\\right|');
});

When('`\\/math status` を実行する', async function () {
  await captureMathStatus(this);
});

When('`\\/math text` を実行して同じセッションを再開し `\\/math status` を実行する', async function () {
  await mathCommand(this).handler('text', { ui: { notify() {} } });
  await registerMathExtension(this);
  await captureMathStatus(this);
});

When('`\\/math text` のあと `\\/math auto` と `\\/math status` を実行する', async function () {
  await mathCommand(this).handler('text', { ui: { notify() {} } });
  await mathCommand(this).handler('auto', { ui: { notify() {} } });
  await captureMathStatus(this);
});

When('`\\/math text --default` を実行して新しいセッションで `\\/math status` を実行する', async function () {
  await mathCommand(this).handler('text --default', { ui: { notify() {} } });
  await registerMathExtension(this, { newSession: true });
  await captureMathStatus(this);
});

When('`\\/math text --default` のあと新しいセッションで `\\/math auto --default` と `\\/math status` を実行する', async function () {
  await mathCommand(this).handler('text --default', { ui: { notify() {} } });
  await registerMathExtension(this, { newSession: true });
  await mathCommand(this).handler('auto --default', { ui: { notify() {} } });
  await captureMathStatus(this);
});

When('Pi の画像判定を確認する', function () {
  const { getCapabilities } = require('@earendil-works/pi-tui');
  this.qniMathCapabilities = getCapabilities();
});

When('端末へ送った問い合わせを確認する', function () {
  this.qniMathQuery = this.qniMathTerminalWrites[0];
});

When('`\\/math image` と `\\/math status` を実行する', async function () {
  await mathCommand(this).handler('image', { ui: { notify() {} } });
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
  assert.match(transferLine, /^\x1b_Ga=T,f=100,q=2,U=1,i=\d+,p=\d+,c=\d+,r=\d+/u);
});

Then('単純なインライン数式は Markdown のまま残る', function () {
  assert.equal(this.qniMathMarkdown, '値は $x$ です。');
});

Then('丸括弧区切りのインライン数式は Markdown のまま残る', function () {
  assert.equal(this.qniMathMarkdown, '値は \\(x\\) です。');
});

Then('変換後のプレースホルダーは画像IDと配置IDを使う', function () {
  assert.deepEqual({
    hasForeground: /\x1b\[38;2;\d+;\d+;\d+m/u.test(this.qniMathMarkdown),
    hasUnderline: /\x1b\[58;2;\d+;\d+;\d+m/u.test(this.qniMathMarkdown),
    hasPlaceholder: this.qniMathMarkdown.includes(PLACEHOLDER)
  }, { hasForeground: true, hasUnderline: true, hasPlaceholder: true });
});

Then('表示数式は独立した複数行に配置される', function () {
  const displayLines = this.qniMathMarkdown
    .split('\n')
    .slice(1)
    .filter((line) => line.startsWith('\x1b[38;2;'));
  assert.ok(displayLines.length >= 2 && displayLines.every((line) => line.includes(PLACEHOLDER)));
});

Then('インライン数式は本文中の Markdown のまま残る', function () {
  assert.ok(this.qniMathMarkdown.includes('値は $x$ です。'));
});

Then('転送する PNG は配置する端末セルの 2 倍の画素密度を持つ', function () {
  const placement = imagePlacement(this.qniMathMarkdown);
  const png = transferredPng(this.qniMathMarkdown);
  const { getCellDimensions } = require('@earendil-works/pi-tui');
  const cell = getCellDimensions();
  assert.deepEqual(
    { width: png.readUInt32BE(16), height: png.readUInt32BE(20) },
    { width: placement.columns * cell.widthPx * 2, height: placement.rows * cell.heightPx * 2 }
  );
});

Then(/^インライン数式の内容は端末セル高の (\d+) パーセント以上になる$/, function (percent) {
  assert.ok(this.qniMathTypesetImage.heightPx >= this.qniMathCell.heightPx * Number(percent) / 100);
});

Then(/^表示数式の内容は端末セル高の (\d+) パーセント以上 (\d+) パーセント未満になる$/, function (minimum, maximum) {
  const ratio = this.qniMathTypesetImage.heightPx / this.qniMathCell.heightPx;
  assert.ok(ratio >= Number(minimum) / 100 && ratio < Number(maximum) / 100);
});

Then('背の高いインライン数式は Markdown のまま残る', function () {
  assert.equal(
    this.qniMathMarkdown,
    'Bell 状態は $\\frac{|00\\rangle+|11\\rangle}{\\sqrt 2}$ です。'
  );
});

Then('Pauli 相関のインライン数式は Markdown のまま残る', function () {
  assert.equal(this.qniMathMarkdown, '相関は $\\langle ZZ\\rangle=1$ です。');
});

Then('PNG 転送は同じ命令で仮想配置とセル寸法を指定する', function () {
  const transfer = this.qniMathMarkdown.match(
    /\x1b_Ga=T,f=100,q=2,U=1,i=(\d+),p=(\d+),c=(\d+),r=(\d+)(?:,m=1)?;/u
  );
  assert.ok(transfer, 'expected a Kitty virtual image transfer');
  assert.equal(transfer[1], transfer[2]);
});

Then('2 つの表示数式が画像配置になる', function () {
  const transferLine = this.qniMathMarkdown.split('\n')[0];
  assert.equal((transferLine.match(/a=T,f=100/g) ?? []).length, 2);
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

Then('braket と直後の ket は独立した項として描かれる', function () {
  assert.equal(this.qniMathActualMacroSvg, this.qniMathExpectedMacroSvg);
});

Then('ket は縦棒と右山括弧で描かれる', function () {
  assert.equal(this.qniMathActualMacroSvg, this.qniMathExpectedMacroSvg);
});

Then('bra は左山括弧と縦棒で描かれる', function () {
  assert.equal(this.qniMathActualMacroSvg, this.qniMathExpectedMacroSvg);
});

Then(/^変換後の Markdown は `\$\\hat\{H\}\$` を含む$/, function () {
  assert.ok(this.qniMathMarkdown.includes('$\\hat{H}$'));
});

Then(/^変換後の Markdown は `\$\\widetilde\{H\}\$` を含む$/, function () {
  assert.ok(this.qniMathMarkdown.includes('$\\widetilde{H}$'));
});

Then('Pi の状態表示に利用者マクロのエラーがある', function () {
  const lines = this.qniMathWidgets.flatMap((widget) => widget.lines);
  assert.ok(lines.some((line) => line.startsWith('macro error: ') && line !== 'macro error: none'));
});

Then('未完成な数式は原文のまま返る', function () {
  assert.equal(this.qniMathMarkdown, '状態 $\\frac{1}{\\sqrt 2}');
});

Then('2 回の変換で同じ画像 ID が使われる', function () {
  assert.equal(this.qniMathFirstPlacement.id, this.qniMathSecondPlacement.id);
});

Then('テーマ変更後の数式画像 ID は変わる', function () {
  assert.notEqual(this.qniMathFirstPlacement.id, this.qniMathSecondPlacement.id);
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
  assert.equal((this.qniMathMarkdown.match(/a=T,f=100/g) ?? []).length, 1);
});

Then('Pi の状態表示にキャッシュ件数 0 がある', function () {
  const lines = this.qniMathWidgets.flatMap((widget) => widget.lines);
  assert.ok(lines.includes('cache: 0 entries, 0 bytes'));
});

Then('Pi の状態表示に画像経路と問い合わせ成功がある', function () {
  const lines = this.qniMathWidgets.flatMap((widget) => widget.lines);
  assert.ok(lines.includes('path: image'));
  assert.ok(lines.includes('reason: 問い合わせ応答 OK'));
});

Then('Pi の状態表示にテキスト経路と問い合わせ拒否がある', function () {
  const lines = this.qniMathWidgets.flatMap((widget) => widget.lines);
  assert.ok(lines.includes('path: text'));
  assert.ok(lines.includes('reason: 問い合わせ応答 EINVAL: unsupported format'));
});

Then('Pi の状態表示にテキスト経路と無応答がある', function () {
  const lines = this.qniMathWidgets.flatMap((widget) => widget.lines);
  assert.ok(lines.includes('path: text'));
  assert.ok(lines.includes('reason: 問い合わせ無応答'));
});

Then('Pi の状態表示にテキスト経路と `TMUX` があり端末問い合わせはない', function () {
  const lines = this.qniMathWidgets.flatMap((widget) => widget.lines);
  assert.ok(lines.includes('path: text'));
  assert.ok(lines.includes('reason: 環境変数 TMUX'));
  assert.equal(this.qniMathTerminalWrites.length, 0);
});

Then('Pi の状態表示にテキスト経路と `TERM=screen` があり端末問い合わせはない', function () {
  const lines = this.qniMathWidgets.flatMap((widget) => widget.lines);
  assert.ok(lines.includes('path: text'));
  assert.ok(lines.includes('reason: 環境変数 TERM=screen'));
  assert.equal(this.qniMathTerminalWrites.length, 0);
});

Then('問い合わせは `a=q` と PNG の `f=100` を使う', function () {
  assert.match(this.qniMathQuery, /^\x1b_G(?=[^;]*a=q)(?=[^;]*f=100)/u);
});

Then('Pi の状態表示にテキスト経路と手動指定がある', function () {
  const lines = this.qniMathWidgets.flatMap((widget) => widget.lines);
  assert.ok(lines.includes('path: text'));
  assert.ok(lines.includes('reason: 手動指定'));
});

Then('Pi の状態表示に画像経路と手動指定がある', function () {
  const lines = this.qniMathWidgets.flatMap((widget) => widget.lines);
  assert.ok(lines.includes('path: image'));
  assert.ok(lines.includes('reason: 手動指定'));
});

Then('Pi の状態表示にテキスト経路と全体既定がある', function () {
  const lines = this.qniMathWidgets.flatMap((widget) => widget.lines);
  assert.ok(lines.includes('path: text'));
  assert.ok(lines.includes('reason: 全体既定'));
});

Then('Pi 全体の画像判定は画像可である', function () {
  assert.equal(this.qniMathCapabilities.images, 'kitty');
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
  assert.ok(lines.includes('path: text'));
  assert.ok(lines.includes('reason: 手動指定'));
});
