const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const path = require('node:path');

const { Then, When } = require('@cucumber/cucumber');
const { PROJECT_ROOT } = require('../support/qni_math_extension');

function qniTool(world) {
  const tool = world.qniMathTools.get('qni');
  assert.ok(tool, 'expected qni-math to register the qni tool');
  return tool;
}

async function executeQniTool(world, args) {
  return qniTool(world).execute('qni-tool-call', { args }, undefined, undefined, {
    cwd: world.scenarioDir
  });
}

async function addHadamard(world) {
  await executeQniTool(world, ['add', 'H', '--qubit', '0', '--step', '0']);
}

function qniToolText(result) {
  assert.deepEqual(result.content.map((item) => item.type), ['text']);
  return result.content[0].text;
}

function renderQniToolResult(world) {
  const theme = { fg: (_color, text) => text };
  return qniTool(world).renderResult(
    world.qniToolResult,
    { expanded: false, isPartial: false },
    theme,
    { args: {}, showImages: true }
  );
}

function executeBundledQni(args, cwd) {
  return new Promise((resolve, reject) => {
    execFile(process.execPath, [path.join(PROJECT_ROOT, 'dist', 'bin', 'qni.js'), ...args], {
      cwd,
      encoding: 'utf8'
    }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve({ stdout, stderr });
    });
  });
}

When('qni ツールで H ゲートを追加して回路を実行する', async function () {
  await addHadamard(this);
  this.qniToolResult = await executeQniTool(this, ['run']);
  this.directQniResult = await executeBundledQni(['run'], this.scenarioDir);
});

When(/^qni ツールで `alpha\|0> \+ beta\|1>` を初期状態に設定して表示する$/, async function () {
  await executeQniTool(this, ['state', 'set', 'alpha|0> + beta|1>']);
  this.qniToolResult = await executeQniTool(this, ['state', 'show']);
});

When(/^qni ツールに `\["--help"\]` を渡す$/, async function () {
  this.qniToolResult = await executeQniTool(this, ['--help']);
});

When(/^qni ツールに `\["run", "--latex"\]` を渡す$/, async function () {
  await addHadamard(this);
  this.qniToolResult = await executeQniTool(this, ['run', '--latex']);
});

When(/^qni ツールに `\["expect", "ZZ", "--latex"\]` を渡す$/, async function () {
  await addHadamard(this);
  await executeQniTool(this, ['add', 'X', '--control', '0', '--qubit', '1', '--step', '1']);
  this.qniToolResult = await executeQniTool(this, ['expect', 'ZZ', '--latex']);
});

When('qni ツールに存在しないサブコマンドを渡す', async function () {
  try {
    await executeQniTool(this, ['does-not-exist']);
    assert.fail('expected the qni tool to fail');
  } catch (error) {
    this.qniToolError = error;
  }
});

When('登録された qni ツールを確認する', function () {
  this.qniToolDefinition = qniTool(this);
});

When('数式描画拡張が登録したツール名を確認する', function () {
  this.qniMathToolNames = Array.from(this.qniMathTools.keys());
});

Then('qni ツールの結果本文は qni-cli の標準出力と一致する', function () {
  assert.equal(qniToolText(this.qniToolResult), this.directQniResult.stdout);
});

Then('qni ツールの結果本文と結果詳細は同じ LaTeX である', function () {
  assert.match(qniToolText(this.qniToolResult), /\\ket\{/u);
  assert.equal(this.qniToolResult.details.latex, qniToolText(this.qniToolResult));
});

Then('qni ツールの結果描画は Image 部品である', function () {
  const { Image } = require('@earendil-works/pi-tui');
  assert.ok(renderQniToolResult(this) instanceof Image);
});

Then('qni ツールの結果描画は文字列である', function () {
  const component = renderQniToolResult(this);
  assert.deepEqual(
    component.render(80).map((line) => line.trimEnd()),
    qniToolText(this.qniToolResult).trimEnd().split('\n')
  );
});

Then(/^qni ツールの結果本文は `alpha\|0> \+ beta\|1>` である$/, function () {
  assert.equal(qniToolText(this.qniToolResult), 'alpha|0> + beta|1>\n');
});

Then('qni ツールの結果本文に qni-cli の使い方がある', function () {
  assert.match(qniToolText(this.qniToolResult), /^qni commands:/m);
});

Then('qni ツールの失敗に qni-cli のエラーがある', function () {
  assert.match(String(this.qniToolError), /Could not find command "does-not-exist"/);
});

Then('qni ツールの失敗に終了ステータス 1 がある', function () {
  assert.match(String(this.qniToolError), /qni exited with status 1/);
});

Then(/^qni ツールの説明に `\["--help"\]` がある$/, function () {
  assert.ok(this.qniToolDefinition.description.includes('["--help"]'));
});

Then('qni ツールの引数スキーマは文字列配列 1 つである', function () {
  const schema = this.qniToolDefinition.parameters;
  assert.deepEqual({
    properties: Object.keys(schema.properties),
    required: schema.required,
    argsType: schema.properties.args.type,
    itemType: schema.properties.args.items.type
  }, {
    properties: ['args'],
    required: ['args'],
    argsType: 'array',
    itemType: 'string'
  });
});

Then('数式描画拡張は bash ツールを登録していない', function () {
  assert.ok(!this.qniMathToolNames.includes('bash'));
});
