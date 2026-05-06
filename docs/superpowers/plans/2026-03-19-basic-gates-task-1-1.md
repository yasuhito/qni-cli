# BasicGates Task 1.1 実装計画

> **自律型エージェント向け:** 必須: サブエージェントを利用できる場合は superpowers:subagent-driven-development、そうでなければ superpowers:executing-plans を使ってこの計画を実装する。進捗管理にはチェックボックス (`- [ ]`) 形式を使う。

**目標:** `QuantumKatas` の `BasicGates Task 1.1 StateFlip` を `qni-cli` 側の回帰テストとして追加し、`|0⟩ -> |1⟩` と `|1⟩ -> |0⟩` を `qni run` で検証できるようにする。

**構成:** 既存の Cucumber ベースの CLI 受け入れテストに、Kata 専用の機能ファイルを 1 つ追加する。`qni-cli` 本体は先に変更せず、まずは既存の `X` ゲートと `qni run` だけでタスク 1.1 を表現できるかを確認し、足りないものがあればテスト補助側に最小限のステップを追加する。

**技術構成:** Ruby, Cucumber, Bundler, `qni-cli`

---

## ファイル構成

- 作成: `features/katas/basic_gates.feature`
  - `BasicGates Task 1.1` の回帰シナリオを持つ。
- 変更: `features/step_definitions/cli_steps.rb`
  - 1 量子ビットの `|1⟩` 初期状態を準備するステップを追加する。
- 確認: `features/cli/add/add_x_gate.feature.md`
  - 既存の `X` ゲート追加機能が回帰していないことを確認する。
- 確認: `features/qni_run.feature`
  - 既存の `qni run` 振る舞いが回帰していないことを確認する。

### タスク 1: Kata 回帰用の機能ファイルを追加する

**ファイル:**
- 作成: `features/katas/basic_gates.feature`
- テスト: `features/katas/basic_gates.feature`

- [ ] **手順 1: 失敗する機能シナリオを書く**

`features/katas/basic_gates.feature` に日本語の機能ファイルを追加し、少なくとも次の 2 シナリオを書く。

```gherkin
# language: ja
機能: Quantum Katas BasicGates
  シナリオ: Task 1.1 は |0> を |1> に反転する
    前提 空の 1 qubit 回路がある
    かつ "qni add X --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,1.0
      """

  シナリオ: Task 1.1 は |1> を |0> に反転する
    前提 1 qubit の初期状態が "|1>" である
    かつ "qni add X --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      1.0,0.0
      """
```

- [ ] **手順 2: 新しい機能ファイルを実行し、失敗することを確認する**

実行:

```bash
bundle exec cucumber features/katas/basic_gates.feature
```

期待結果:

- 1 本目のシナリオは通る可能性がある
- 2 本目は `前提 1 qubit の初期状態が "|1>" である` が未定義で失敗する

- [ ] **手順 3: 失敗するテストをコミットする**

```bash
git add features/katas/basic_gates.feature
git commit -m "test: add BasicGates Task 1.1 regression scenarios"
```

### タスク 2: 不足している 1 量子ビットの状態準備ステップを追加する

**ファイル:**
- 変更: `features/step_definitions/cli_steps.rb`
- テスト: `features/katas/basic_gates.feature`

- [ ] **手順 1: 対象を絞った失敗を再実行する**

実行:

```bash
bundle exec cucumber features/katas/basic_gates.feature:12
```

期待結果:

- 未定義ステップのエラーが再現する

- [ ] **手順 2: 最小限のステップ定義を書く**

`features/step_definitions/cli_steps.rb` に、1 量子ビットの初期状態を作るステップを追加する。

```ruby
前提('1 qubit の初期状態が {string} である') do |state|
  actual_path = File.join(@scenario_dir, 'circuit.json')
  col = case state
        when '|0>'
          [1]
        when '|1>'
          ['X']
        else
          raise "unsupported 1-qubit initial state: #{state}"
        end
  actual = {
    'qubits' => 1,
    'cols' => [col]
  }
  File.write(actual_path, "#{JSON.pretty_generate(actual)}\n")
end
```

- [ ] **手順 3: Kata の機能ファイルを実行し、成功することを確認する**

実行:

```bash
bundle exec cucumber features/katas/basic_gates.feature
```

期待結果:

- 2 シナリオ
- 失敗 0 件

- [ ] **手順 4: 補助コードの変更をコミットする**

```bash
git add features/step_definitions/cli_steps.rb features/katas/basic_gates.feature
git commit -m "test: support BasicGates Task 1.1 state preparation"
```

### タスク 3: `qni-cli` 本体の変更が不要であることを確認する

**ファイル:**
- 確認: `features/cli/add/add_x_gate.feature.md`
- 確認: `features/qni_run.feature`
- 確認: `features/katas/basic_gates.feature`

- [ ] **手順 1: 既存の X ゲート機能を実行する**

実行:

```bash
bundle exec cucumber features/cli/add/add_x_gate.feature.md
```

期待結果:

- 成功

- [ ] **手順 2: 既存の `qni run` 機能を実行する**

実行:

```bash
bundle exec cucumber features/qni_run.feature
```

期待結果:

- 成功

- [ ] **手順 3: Kata の機能ファイルを再実行する**

実行:

```bash
bundle exec cucumber features/katas/basic_gates.feature
```

期待結果:

- 成功

- [ ] **手順 4: `qni-cli` 実装変更が引き続き不要か確認する**

確認:

- `features/katas/basic_gates.feature` が成功している
- `features/cli/add/add_x_gate.feature.md` が成功している
- `features/qni_run.feature` が成功している
- `lib/` 配下に変更が不要である

すべて満たす場合:

- 今回は `qni-cli` 本体の変更は不要
- タスク 1.1 は既存機能で表現・検証可能と結論づける

- [ ] **手順 5: 検証結果をコミットする**

```bash
git add features/katas/basic_gates.feature features/step_definitions/cli_steps.rb
git commit -m "test: verify BasicGates Task 1.1 with existing qni-cli"
```

## メモ

- タスク 1.1 は最初の回帰ケースなので、補助検証は追加しない。まずは `qni run` の状態ベクトル比較だけで成立させる。
- もし `features/qni_run.feature` の既存ステップだけで `|1>` 初期状態を十分に表現できる別手段が見つかれば、新しいステップ追加は不要。その場合でも計画は「最小変更で成功させる」という原則で実行する。
- `QuantumKatas` 本体は編集しない。参照のみ。
