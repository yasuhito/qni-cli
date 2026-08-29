const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { Given, Then, When } = require('@cucumber/cucumber');
const { PROJECT_ROOT, registerMathExtension } = require('../support/qni_math_extension');

function qniTool(world) {
  const tool = world.qniMathTools.get('qni');
  assert.ok(tool, 'expected qni-math to register the qni tool');
  return tool;
}

async function executeQniParams(world, params) {
  const result = await qniTool(world).execute('qni-tool-call', params, undefined, undefined, {
    cwd: world.scenarioDir
  });
  const actualWorkdir = result?.details?.workdir;
  if (typeof actualWorkdir === 'string' && !actualWorkdir.startsWith(world.scenarioDir)) {
    world.tempDirs = [...(world.tempDirs ?? []), actualWorkdir];
  }
  return result;
}

async function executeQniTool(world, args, workdir) {
  const params = workdir === undefined ? { args } : { args, workdir };
  return executeQniParams(world, params);
}

async function executeQniCommands(world, commands, workdir) {
  const params = workdir === undefined ? { commands } : { commands, workdir };
  return executeQniParams(world, params);
}

async function addHadamard(world, workdir) {
  return executeQniTool(world, ['add', 'H', '--qubit', '0', '--step', '0'], workdir);
}

function qniToolText(result) {
  assert.deepEqual(result.content.map((item) => item.type), ['text']);
  return result.content[0].text;
}

function renderQniToolResult(world, expanded = false) {
  const theme = { fg: (_color, text) => text };
  return qniTool(world).renderResult(
    world.qniToolResult,
    { expanded, isPartial: false },
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

async function captureWorkdirError(world, workdir) {
  try {
    await executeQniTool(world, ['--help'], workdir);
    assert.fail('expected the qni tool to reject workdir');
  } catch (error) {
    world.qniToolError = error;
  }
}

Given('Pi の作業場所に既存の回路がある', async function () {
  await executeQniTool(this, ['add', 'X', '--qubit', '0', '--step', '0'], '.');
  this.originalCircuit = fs.readFileSync(path.join(this.scenarioDir, 'circuit.json'), 'utf8');
});

Given('qni-cli の実行回数を記録する偽の Pi ExtensionAPI に数式描画拡張を登録する', async function () {
  this.qniExecutionCount = 0;
  await registerMathExtension(this, {
    exec: async () => {
      this.qniExecutionCount += 1;
      return { stdout: '', stderr: '', code: 0, killed: false };
    }
  });
});

Given('大きな標準出力を返す偽の Pi ExtensionAPI に数式描画拡張を登録する', async function () {
  await registerMathExtension(this, {
    exec: async () => ({
      stdout: `${Array.from({ length: 2001 }, (_, index) => `line-${index + 1}`).join('\n')}\n`,
      stderr: '',
      code: 0,
      killed: false
    })
  });
});

Given('キャンセル結果を返す偽の Pi ExtensionAPI に数式描画拡張を登録する', async function () {
  await registerMathExtension(this, {
    exec: async () => ({ stdout: '', stderr: '', code: 143, killed: true })
  });
});

Given('qni-cli の実行順を記録する偽の Pi ExtensionAPI に数式描画拡張を登録する', async function () {
  this.qniExecutionOrder = [];
  let call = 0;
  await registerMathExtension(this, {
    exec: async () => {
      call += 1;
      const current = call;
      this.qniExecutionOrder.push(`start-${current}`);
      await new Promise((resolve) => setTimeout(resolve, current === 1 ? 30 : 0));
      this.qniExecutionOrder.push(`end-${current}`);
      return { stdout: '', stderr: '', code: 0, killed: false };
    }
  });
});

When('qni ツールで H ゲートを追加して回路を実行する', async function () {
  const added = await addHadamard(this);
  this.qniToolResult = await executeQniTool(this, ['run']);
  this.directQniResult = await executeBundledQni(['run'], added.details.workdir);
});

When('作業場所を省略して qni ツールで H ゲートを追加する', async function () {
  await addHadamard(this);
});

When('作業場所を省略して H ゲートを追加して回路を実行する', async function () {
  const added = await addHadamard(this);
  this.qniToolResult = await executeQniTool(this, ['run']);
  this.directQniResult = await executeBundledQni(['run'], added.details.workdir);
});

When('作業場所を省略して H ゲートを追加して拡張を reload して回路を実行する', async function () {
  const added = await addHadamard(this);
  const shutdown = this.qniMathEventHandlers.get('session_shutdown');
  assert.ok(shutdown);
  await shutdown({ reason: 'reload' }, {});
  await registerMathExtension(this, { sessionStartReason: 'reload' });
  this.qniToolResult = await executeQniTool(this, ['run']);
  this.directQniResult = await executeBundledQni(['run'], added.details.workdir);
});

When('各セッション終了理由で一時作業場所を終了する', async function () {
  this.closedTemporaryWorkdirs = [];
  for (const reason of ['quit', 'new', 'resume', 'fork']) {
    await registerMathExtension(this, { newSession: true });
    const result = await executeQniTool(this, ['--help']);
    const shutdown = this.qniMathEventHandlers.get('session_shutdown');
    assert.ok(shutdown);
    await shutdown({ reason }, {});
    this.closedTemporaryWorkdirs.push(result.details.workdir);
  }
});

When('保存された一時作業場所が別のディレクトリへのシンボリックリンクである', async function () {
  const victim = fs.mkdtempSync(path.join(os.tmpdir(), 'qni-cli-victim-'));
  const link = path.join(os.tmpdir(), `qni-cli-pi-restored-${path.basename(this.scenarioDir)}`);
  fs.symlinkSync(victim, link);
  this.qniMathSessionEntries.push({
    type: 'custom',
    customType: 'qni-tool-temporary-workdir',
    data: { workdir: link }
  });
  await registerMathExtension(this, { sessionStartReason: 'reload' });
  const shutdown = this.qniMathEventHandlers.get('session_shutdown');
  assert.ok(shutdown);
  await shutdown({ reason: 'quit' }, {});
  this.restoredWorkdirVictimExists = fs.existsSync(victim);
  fs.rmSync(link, { force: true });
  fs.rmSync(victim, { recursive: true, force: true });
});

When('`workdir: "."` で qni ツールを実行する', async function () {
  this.qniToolResult = await addHadamard(this, '.');
});

When('既存の子ディレクトリを workdir に指定して qni ツールを実行する', async function () {
  fs.mkdirSync(path.join(this.scenarioDir, 'circuits'));
  this.qniToolResult = await addHadamard(this, 'circuits');
});

When('存在しない workdir で qni ツールを実行する', async function () {
  await captureWorkdirError(this, 'missing');
});

When('通常ファイルを workdir に指定して qni ツールを実行する', async function () {
  fs.writeFileSync(path.join(this.scenarioDir, 'not-a-directory'), 'file');
  await captureWorkdirError(this, 'not-a-directory');
});

When('絶対パスを workdir に指定して qni ツールを実行する', async function () {
  await captureWorkdirError(this, this.scenarioDir);
});

When('Pi の作業場所より外側を workdir に指定して qni ツールを実行する', async function () {
  await captureWorkdirError(this, '..');
});

When('外側へのシンボリックリンクを workdir に指定して qni ツールを実行する', async function () {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'qni-cli-outside-'));
  this.tempDirs = [...(this.tempDirs ?? []), outside];
  fs.symlinkSync(outside, path.join(this.scenarioDir, 'outside-link'));
  await captureWorkdirError(this, 'outside-link');
});

When('同じ作業場所へ 2 回同時に qni ツールを呼ぶ', async function () {
  await Promise.all([
    executeQniTool(this, ['--help'], '.'),
    executeQniTool(this, ['--help'], '.')
  ]);
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

When('qni ツールで X ゲートの追加と回路表示を一括実行する', async function () {
  this.qniToolResult = await executeQniCommands(this, [
    ['add', 'X', '--qubit=1', '--step=1'],
    ['view']
  ]);
});

When('qni ツールで初期状態の設定と表示を一括実行する', async function () {
  this.qniToolResult = await executeQniCommands(this, [
    ['state', 'set', 'alpha|0> + beta|1>'],
    ['state', 'show']
  ]);
});

When(/^qni ツールへ不正な入力 (.*) を渡す$/, async function (input) {
  const paramsByInput = {
    '`args` と `commands` の両方': { args: ['--help'], commands: [['--help']] },
    '`args` と `commands` の両方を省略': {},
    '空の `commands`': { commands: [] },
    '空のコマンドを含む `commands`': { commands: [[]] }
  };
  try {
    await executeQniParams(this, paramsByInput[input]);
    assert.fail('expected the qni tool to reject invalid input');
  } catch (error) {
    this.qniToolError = error;
  }
});

When('qni ツールで成功、失敗、未実行のコマンドを一括実行する', async function () {
  try {
    await executeQniCommands(this, [
      ['add', 'X', '--qubit=0', '--step=0'],
      ['does-not-exist'],
      ['add', 'H', '--qubit=0', '--step=1']
    ], '.');
    assert.fail('expected the qni tool batch to fail');
  } catch (error) {
    this.qniToolError = error;
  }
});

When('同じ作業場所へ一括実行と単一実行を同時に呼ぶ', async function () {
  await Promise.all([
    executeQniCommands(this, [['--help'], ['--help']], '.'),
    executeQniTool(this, ['--help'], '.')
  ]);
});

When('qni ツールで回路追加と LaTeX 実行を一括実行する', async function () {
  this.qniToolResult = await executeQniCommands(this, [
    ['add', 'H', '--qubit=0', '--step=0'],
    ['run', '--latex']
  ]);
});

When('qni ツールで LaTeX コマンドを一括実行する', async function () {
  this.qniToolResult = await executeQniCommands(this, [['run', '--latex']]);
});

When('qni ツールで LaTeX コマンドを単一実行する', async function () {
  this.qniToolResult = await executeQniTool(this, ['run', '--latex']);
});

async function captureCancellation(world, batch) {
  try {
    if (batch) await executeQniCommands(world, [['--help'], ['run']]);
    else await executeQniTool(world, ['--help']);
    assert.fail('expected the qni tool to report cancellation');
  } catch (error) {
    world.qniToolError = error;
  }
}

When('qni ツールで複数コマンドを一括実行する', async function () {
  await captureCancellation(this, true);
});

When('qni ツールでコマンドを単一実行する', async function () {
  await captureCancellation(this, false);
});

Then('qni ツールの結果本文は qni-cli の標準出力と一致する', function () {
  assert.equal(qniToolText(this.qniToolResult), this.directQniResult.stdout);
});

Then('Pi の作業場所にある回路は変更されていない', function () {
  assert.equal(fs.readFileSync(path.join(this.scenarioDir, 'circuit.json'), 'utf8'), this.originalCircuit);
});

Then('実行結果は先に追加した H ゲートを使う', function () {
  assert.equal(qniToolText(this.qniToolResult), this.directQniResult.stdout);
});

Then('reload 後の実行結果は先に追加した H ゲートを使う', function () {
  assert.equal(qniToolText(this.qniToolResult), this.directQniResult.stdout);
});

Then('reload 以外の終了理由では一時作業場所が削除される', function () {
  assert.ok(this.closedTemporaryWorkdirs.every((workdir) => !fs.existsSync(workdir)));
});

Then('セッション終了時にリンク先のディレクトリを削除しない', function () {
  assert.equal(this.restoredWorkdirVictimExists, true);
});

Then('qni ツールは Pi の作業場所を使う', function () {
  assert.ok(fs.existsSync(path.join(this.scenarioDir, 'circuit.json')));
});

Then('qni ツールは指定した子ディレクトリを使う', function () {
  assert.ok(fs.existsSync(path.join(this.scenarioDir, 'circuits', 'circuit.json')));
});

Then('qni ツールは作業場所を拒否する', function () {
  assert.match(String(this.qniToolError), /workdir/u);
});

Then('qni ツールは呼び出した順に実行する', function () {
  assert.deepEqual(this.qniExecutionOrder, ['start-1', 'end-1', 'start-2', 'end-2']);
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

Then('qni ツールの説明に一括実行と残りだけの再実行がある', function () {
  assert.match(this.qniToolDefinition.description, /commands/u);
  assert.match(this.qniToolDefinition.description, /成功分の変更は残る/u);
  assert.match(this.qniToolDefinition.description, /残りだけを呼び直す/u);
});

Then('qni ツールの引数スキーマに args と任意の workdir がある', function () {
  const schema = this.qniToolDefinition.parameters;
  assert.deepEqual({
    properties: Object.keys(schema.properties),
    required: schema.required,
    argsType: schema.properties.args.type,
    itemType: schema.properties.args.items.type,
    commandsType: schema.properties.commands.type,
    commandType: schema.properties.commands.items.type,
    commandItemType: schema.properties.commands.items.items.type,
    workdirType: schema.properties.workdir.type
  }, {
    properties: ['args', 'commands', 'workdir'],
    required: undefined,
    argsType: 'array',
    itemType: 'string',
    commandsType: 'array',
    commandType: 'array',
    commandItemType: 'string',
    workdirType: 'string'
  });
});

Then('qni ツールの結果詳細に実際の作業場所がある', function () {
  assert.equal(typeof this.qniToolResult.details.workdir, 'string');
  assert.ok(path.isAbsolute(this.qniToolResult.details.workdir));
});

Then('qni ツールの展開表示に実際の作業場所がある', function () {
  const lines = renderQniToolResult(this, true).render(120).join('\n');
  assert.ok(lines.includes(this.qniToolResult.details.workdir));
});

Then('数式描画拡張は bash ツールを登録していない', function () {
  assert.ok(!this.qniMathToolNames.includes('bash'));
});

Then('一括実行の結果はコマンドごとの見出し付き本文である', function () {
  assert.equal(this.qniToolResult.content.length, 2);
  assert.equal(this.qniToolResult.content[0].text, '$ qni add X --qubit=1 --step=1');
  assert.match(this.qniToolResult.content[1].text, /^\$ qni view\n[\s\S]*X/u);
});

Then('一括実行の見出しは特別な引数だけを引用する', function () {
  assert.match(
    this.qniToolResult.content[0].text.split('\n')[0],
    /^\$ qni state set 'alpha\|0> \+ beta\|1>'$/u
  );
});

Then('qni ツールは qni-cli を実行せず入力を拒否する', function () {
  assert.equal(this.qniExecutionCount, 0);
  assert.match(String(this.qniToolError), /args|commands/u);
});

Then('一括実行の失敗は成功分と停止位置を示して変更を残す', function () {
  const message = String(this.qniToolError);
  assert.match(message, /\$ qni add X --qubit=0 --step=0/u);
  assert.match(message, /\$ qni does-not-exist/u);
  assert.match(message, /qni exited with status 1/u);
  assert.match(message, /Stopped at command 2 of 3\. Commands 1 succeeded and their changes remain in the workdir\. Command 3 was not run\./u);
  assert.doesNotMatch(message, /\$ qni add H/u);
  const circuit = JSON.parse(fs.readFileSync(path.join(this.scenarioDir, 'circuit.json'), 'utf8'));
  assert.equal(circuit.cols.flat().includes('X'), true);
});

Then('単一実行は一括実行の後に動く', function () {
  assert.deepEqual(this.qniExecutionOrder, [
    'start-1', 'end-1', 'start-2', 'end-2', 'start-3', 'end-3'
  ]);
});

Then('一括実行の結果詳細は LaTeX とコマンド引数を保持する', function () {
  assert.deepEqual(this.qniToolResult.details.commands[0], {
    args: ['add', 'H', '--qubit=0', '--step=0']
  });
  assert.deepEqual(this.qniToolResult.details.commands[1].args, ['run', '--latex']);
  assert.match(this.qniToolResult.details.commands[1].latex, /\\ket\{/u);
});

Then('一括実行の結果描画は見出し、文字列、Image 部品の順である', function () {
  const { Container, Image, Text } = require('@earendil-works/pi-tui');
  const component = renderQniToolResult(this);
  assert.ok(component instanceof Container);
  assert.equal(component.children.length, 3);
  assert.ok(component.children[0] instanceof Text);
  assert.ok(component.children[1] instanceof Text);
  assert.ok(component.children[2] instanceof Image);
});

Then('一括実行の結果描画はすべて文字列である', function () {
  const { Container, Text } = require('@earendil-works/pi-tui');
  const component = renderQniToolResult(this);
  assert.ok(component instanceof Container);
  assert.ok(component.children.every((child) => child instanceof Text));
});

Then('一括実行の出力は切り詰められて LaTeX を保持しない', function () {
  assert.match(this.qniToolResult.content[0].text, /\[Output truncated: 2000 of 2001 lines/u);
  assert.equal(this.qniToolResult.details.commands[0].latex, undefined);
});

Then('単一実行の出力は切り詰められて LaTeX を保持しない', function () {
  assert.match(qniToolText(this.qniToolResult), /\[Output truncated: 2000 of 2001 lines/u);
  assert.equal(this.qniToolResult.details.latex, undefined);
});

Then('qni ツールはキャンセルを終了ステータスなしで報告する', function () {
  assert.match(String(this.qniToolError), /qni was cancelled/u);
  assert.doesNotMatch(String(this.qniToolError), /status/u);
});
