const assert = require('node:assert/strict');
const { Given, Then, When } = require('@cucumber/cucumber');
const { registerQniToolsExtension } = require('../support/qni_tools_extension');

Given('偽の Pi ExtensionAPI に qni ツール拡張を登録する', async function () {
  await registerQniToolsExtension(this);
});

When(/^pi-formula の変換器で `\\ket\{\\psi\}`、`\\bra\{\\psi\}`、`\\braket\{\\phi\|\\psi\}` を含む表示数式を変換する$/, function () {
  assert.ok(this.qniFormulaTransformer, 'expected pi-formula to register a Markdown transformer');
  this.qniFormulaMarkdown = this.qniFormulaTransformer(
    '$$\\ket{\\psi} + \\bra{\\psi} + \\braket{\\phi|\\psi}$$',
    { messageType: 'assistant', isStreaming: false, availableWidth: 80 }
  );
});

Then('pi-formula の変換結果は画像配置になる', function () {
  assert.match(this.qniFormulaMarkdown, /\x1b_Ga=T,f=100/u);
});

Then('qni ツール拡張が登録する Markdown 変換器はない', function () {
  assert.equal(this.qniToolsTransformers.length, 1);
});

Then(/^`\/formula` は一つだけ登録される$/, function () {
  assert.equal(this.qniToolsCommands.get('formula').length, 1);
});
