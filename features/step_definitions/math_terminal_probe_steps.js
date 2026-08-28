const assert = require('node:assert/strict');

const { Given, Then, When } = require('@cucumber/cucumber');
const { registerMathExtension } = require('../support/qni_math_extension');

Given('PNG 問い合わせの `OK` を分割して返す偽の端末で数式描画拡張を起動する', async function () {
  await registerMathExtension(this, { response: 'OK', splitResponse: true });
});

Given('通常入力と PNG 問い合わせの `OK` をまとめて返す偽の端末で数式描画拡張を起動する', async function () {
  await registerMathExtension(this, { response: 'OK', combinedResponse: true });
});

When('端末応答の前後にあった入力を確認する', function () {
  this.qniMathRemainingInput = this.qniMathForwardedInput;
});

Then('通常入力だけが Pi へ残る', function () {
  assert.equal(this.qniMathRemainingInput, 'typed--tail');
});
