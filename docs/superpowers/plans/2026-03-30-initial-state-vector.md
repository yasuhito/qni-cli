# Initial State Vector Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1 qubit の初期状態ベクトルを `qni` の正式機能として追加し、CLI・`circuit.json`・numeric run・symbolic run・feature DSL から一貫して扱えるようにする。

**Architecture:** まず feature-first で `qni state` CLI と `initial_state` 付き run の acceptance を赤くする。次に `InitialState` モデルを追加して `Circuit`/`CircuitFile` の JSON 経路へ組み込み、numeric run と symbolic run をそれぞれ既存経路に最小差分で接続する。数値実行は既存の `StateVector` を維持し、symbolic 実行だけ SymPy ベースの初期状態評価を追加する。

**Tech Stack:** Ruby, Cucumber, Minitest, Bundler, SymPy helper (`libexec/qni_symbolic_run.py`), `qni-cli`

---

## File Structure

- Create: `features/qni_state.feature`
  - `qni state set/show/clear` の acceptance を追加する。
- Modify: `features/qni_run.feature`
  - `initial_state` 付き symbolic run / numeric run / validation failure を追加する。
- Modify: `features/katas/basic_gates/state_flip.feature`
  - 必要なら `alpha|0> + beta|1>` を使う高レベル scenario を追加する。
- Modify: `features/step_definitions/cli_steps.rb`
  - `Given 初期状態ベクトルは:` で `alpha|0> + beta|1>` を `initial_state` JSON に落とせるようにする。
- Create: `test/qni/initial_state_test.rb`
  - `InitialState` の parse / JSON round-trip / numeric resolution / validation を unit test する。
- Create: `lib/qni/initial_state.rb`
  - 1 qubit 初期状態の parse / normalize / JSON serialize / numeric resolve を担当する。
- Modify: `lib/qni/circuit.rb`
  - `initial_state` を保持し、`to_h` / `from_h` に組み込む。
- Modify: `lib/qni/circuit_file.rb`
  - `initial_state` を読む / 書くユーティリティを追加する。
- Modify: `lib/qni/simulator.rb`
  - zero state ではなく `initial_state` から開始できるようにする。
- Modify: `lib/qni/state_vector.rb`
  - 必要なら arbitrary amplitudes から構築する補助を追加する。
- Modify: `lib/qni/symbolic_state_renderer.rb`
  - helper へ `initial_state` 付き JSON を渡すだけに留める。
- Modify: `libexec/qni_symbolic_run.py`
  - `initial_state` を SymPy ベクトルへ変換し、そこから gate を適用できるようにする。
- Modify: `lib/qni/cli.rb`
  - `state` サブコマンドを登録する。
- Create: `lib/qni/cli/state_command.rb`
  - `set/show/clear` の実装本体を持つ。
- Create: `lib/qni/cli/state_help.rb`
  - `qni state` の help text を持つ。
- Modify: `features/qni_cli.feature`
  - `qni state` help と usage の acceptance を追加する。

## Task 1: CLI と run の acceptance を先に赤くする

**Files:**
- Create: `features/qni_state.feature`
- Modify: `features/qni_run.feature`
- Modify: `features/qni_cli.feature`
- Test: `features/qni_state.feature`
- Test: `features/qni_run.feature`
- Test: `features/qni_cli.feature`

- [ ] **Step 1: `qni state` feature を追加する**

`features/qni_state.feature` を新規作成し、少なくとも次を入れる。

```gherkin
Feature: qni state コマンド
  初期状態ベクトルを設定・表示・解除したい

  Scenario: qni state set は alpha|0> + beta|1> を保存する
    When "qni state set \"alpha|0> + beta|1>\"" を実行
    Then コマンドは成功
    And circuit.json:
      """
      {
        "qubits": 1,
        "initial_state": {
          "format": "ket_sum_v1",
          "terms": [
            { "basis": "0", "coefficient": "alpha" },
            { "basis": "1", "coefficient": "beta" }
          ]
        },
        "cols": [
          [1]
        ]
      }
      """

  Scenario: qni state show は現在の初期状態を表示する
    Given "qni state set \"alpha|0> + beta|1>\"" を実行
    When "qni state show" を実行
    Then 標準出力:
      """
      alpha|0> + beta|1>
      """

  Scenario: qni state clear は初期状態設定を削除する
    Given "qni state set \"alpha|0> + beta|1>\"" を実行
    When "qni state clear" を実行
    Then コマンドは成功
    And circuit.json:
      """
      {
        "qubits": 1,
        "cols": [
          [1]
        ]
      }
      """
```

- [ ] **Step 2: `qni run` acceptance を追加する**

`features/qni_run.feature` に次の scenario を追加する。

```gherkin
Scenario: qni run --symbolic は初期状態ベクトル alpha|0> + beta|1> に X を適用する
  Given "qni state set \"alpha|0> + beta|1>\"" を実行
  And "qni add X --qubit 0 --step 0" を実行
  When "qni run --symbolic" を実行
  Then 標準出力:
    """
    beta|0> + alpha|1>
    """

Scenario: qni run は変数解決した初期状態ベクトルから数値実行する
  Given "qni state set \"alpha|0> + beta|1>\"" を実行
  And "qni variable set alpha 0.6" を実行
  And "qni variable set beta 0.8" を実行
  And "qni add X --qubit 0 --step 0" を実行
  When "qni run" を実行
  Then 標準出力:
    """
    0.8,0.6
    """

Scenario: qni run は未束縛の初期状態変数では失敗する
  Given "qni state set \"alpha|0> + beta|1>\"" を実行
  When "qni run" を実行
  Then コマンドは失敗
  And 標準エラー出力:
    """
    unresolved initial state variable: alpha
    """

Scenario: qni run は非正規化の初期状態ベクトルでは失敗する
  Given "qni state set \"alpha|0> + beta|1>\"" を実行
  And "qni variable set alpha 1" を実行
  And "qni variable set beta 1" を実行
  When "qni run" を実行
  Then コマンドは失敗
  And 標準エラー出力:
    """
    initial state must be normalized
    """
```

既存 step で足りない assertion は後続 task で追加する。

- [ ] **Step 3: CLI help acceptance を追加する**

`features/qni_cli.feature` に `qni state` の help scenario を追加する。

```gherkin
Scenario: qni state help は初期状態ベクトルの設定方法を表示
  When "qni help state" を実行
  Then 標準出力に次を含む:
    """
    qni state set "alpha|0> + beta|1>"
    """
```

- [ ] **Step 4: red を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_state.feature \
  features/qni_run.feature \
  features/qni_cli.feature
```

Expected:

- `qni state` 未実装で赤くなる
- `initial_state` 未対応で赤くなる
- 失敗理由が typo ではなく機能不足に対応している

- [ ] **Step 5: feature-first の red をコミットする**

```bash
git add features/qni_state.feature features/qni_run.feature features/qni_cli.feature
git commit -m "test: add initial state vector acceptance"
```

## Task 2: `InitialState` モデルを追加する

**Files:**
- Create: `test/qni/initial_state_test.rb`
- Create: `lib/qni/initial_state.rb`
- Test: `test/qni/initial_state_test.rb`

- [ ] **Step 1: unit test を赤く書く**

`test/qni/initial_state_test.rb` を作成し、少なくとも次を入れる。

```ruby
def test_parse_symbolic_ket_sum
  initial_state = Qni::InitialState.parse('alpha|0> + beta|1>')

  assert_equal(
    {
      'format' => 'ket_sum_v1',
      'terms' => [
        { 'basis' => '0', 'coefficient' => 'alpha' },
        { 'basis' => '1', 'coefficient' => 'beta' }
      ]
    },
    initial_state.to_h
  )
end

def test_resolve_numeric_amplitudes
  initial_state = Qni::InitialState.parse('alpha|0> + beta|1>')

  assert_equal [0.6, 0.8], initial_state.resolve_numeric('alpha' => '0.6', 'beta' => '0.8')
end

def test_rejects_non_normalized_numeric_state
  initial_state = Qni::InitialState.parse('alpha|0> + beta|1>')

  error = assert_raises(Qni::InitialState::Error) do
    initial_state.resolve_numeric('alpha' => '1', 'beta' => '1')
  end

  assert_equal 'initial state must be normalized', error.message
end
```

- [ ] **Step 2: unit test が赤いことを確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
```

Expected:

- `LoadError` または `NameError`

- [ ] **Step 3: `InitialState` の最小実装を書く**

`lib/qni/initial_state.rb` に次を実装する。

- `parse(string)`
- `from_h(hash)`
- `to_h`
- `resolve_numeric(variables)`
- `default_for(qubits)` は第 1 段では 1 qubit の `|0>` のみ

第 1 段の parse 対象は次のみに限定する。

```ruby
'alpha|0> + beta|1>'
'0.6|0> + 0.8|1>'
'|0>'
'|1>'
```

validation:

- basis は `0` と `1` のみ
- 項数は 1 か 2
- 数値 run では全係数が解決できる
- ノルム 1 を満たす

- [ ] **Step 4: unit test を green にする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
```

Expected:

- PASS

- [ ] **Step 5: `InitialState` モデルをコミットする**

```bash
git add test/qni/initial_state_test.rb lib/qni/initial_state.rb
git commit -m "feat: add initial state model"
```

## Task 3: `Circuit` と `CircuitFile` に `initial_state` を通す

**Files:**
- Modify: `lib/qni/circuit.rb`
- Modify: `lib/qni/circuit_file.rb`
- Modify: `test/qni/initial_state_test.rb`
- Test: `test/qni/initial_state_test.rb`
- Test: `features/qni_state.feature`

- [ ] **Step 1: JSON round-trip の failing test を追加する**

`test/qni/initial_state_test.rb` に次を足す。

```ruby
def test_circuit_to_h_includes_initial_state
  circuit = Qni::Circuit.from_h(
    'qubits' => 1,
    'initial_state' => {
      'format' => 'ket_sum_v1',
      'terms' => [
        { 'basis' => '0', 'coefficient' => 'alpha' },
        { 'basis' => '1', 'coefficient' => 'beta' }
      ]
    },
    'cols' => [[1]]
  )

  assert_equal 'alpha', circuit.to_h.fetch('initial_state').fetch('terms').first.fetch('coefficient')
end
```

- [ ] **Step 2: `Circuit` に `initial_state` を追加する**

`lib/qni/circuit.rb` で次を行う。

- `initialize(qubits:, steps:, variables:, initial_state: nil)`
- `attributes_from` で `initial_state` を読む
- `to_h` で `initial_state` を書く
- 指定がなければ従来どおり `nil`

- [ ] **Step 3: `CircuitFile` に state accessor を追加する**

`lib/qni/circuit_file.rb` に少なくとも次の helper を追加する。

```ruby
def set_initial_state(initial_state:)
def clear_initial_state
```

これらは既存の `circuit.json` を壊さず更新する。

- [ ] **Step 4: `qni_state.feature` の JSON 保存シナリオを green にする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_state.feature
```

Expected:

- `state set` の保存確認以外はまだ赤でもよい

- [ ] **Step 5: JSON 経路の変更をコミットする**

```bash
git add lib/qni/circuit.rb lib/qni/circuit_file.rb test/qni/initial_state_test.rb features/qni_state.feature
git commit -m "feat: persist initial state in circuit JSON"
```

## Task 4: `qni state` CLI を実装する

**Files:**
- Modify: `lib/qni/cli.rb`
- Create: `lib/qni/cli/state_command.rb`
- Create: `lib/qni/cli/state_help.rb`
- Modify: `features/qni_cli.feature`
- Test: `features/qni_state.feature`
- Test: `features/qni_cli.feature`

- [ ] **Step 1: help / dispatch の failing expectation を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_state.feature \
  features/qni_cli.feature
```

Expected:

- `qni state` unknown command で赤い

- [ ] **Step 2: `state` subcommand を登録する**

`lib/qni/cli.rb` で `state` サブコマンドを追加し、既存の `variable` と同じパターンで help と dispatch をつなぐ。

- [ ] **Step 3: `StateCommand` を実装する**

`lib/qni/cli/state_command.rb` に次を実装する。

- `set`
- `show`
- `clear`

`set` は `InitialState.parse` を使い、`CircuitFile#set_initial_state` を呼ぶ。

- [ ] **Step 4: help text を追加する**

`lib/qni/cli/state_help.rb` に usage text を書く。

最低限、次の例を入れる。

```text
qni state set "alpha|0> + beta|1>"
qni state show
qni state clear
```

- [ ] **Step 5: `qni state` の acceptance を green にする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_state.feature \
  features/qni_cli.feature
```

Expected:

- `qni state set/show/clear` が PASS
- help scenario が PASS

- [ ] **Step 6: CLI 実装をコミットする**

```bash
git add lib/qni/cli.rb lib/qni/cli/state_command.rb lib/qni/cli/state_help.rb features/qni_state.feature features/qni_cli.feature
git commit -m "feat: add qni state command"
```

## Task 5: numeric run を `initial_state` から開始できるようにする

**Files:**
- Modify: `lib/qni/simulator.rb`
- Modify: `lib/qni/state_vector.rb`
- Modify: `features/qni_run.feature`
- Test: `features/qni_run.feature`
- Test: `test/qni/initial_state_test.rb`

- [ ] **Step 1: numeric run の failing scenario を絞って実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_run.feature:390
```

Expected:

- `initial_state` を無視するか未対応で赤い

- [ ] **Step 2: `StateVector` の構築補助を追加する**

`lib/qni/state_vector.rb` に、振幅配列から 1 qubit state を構築する安全な class method を追加する。

```ruby
def self.from_amplitudes(qubits:, amplitudes:)
  new(qubits:, amplitudes:)
end
```

必要なら長さ validation もここで行う。

- [ ] **Step 3: `Simulator` が初期状態から開始するようにする**

`lib/qni/simulator.rb` の run 経路で、

- `circuit_hash['initial_state']` があれば `InitialState.from_h(...).resolve_numeric(variables)` を使う
- そこから `StateVector.from_amplitudes` を作る
- なければ `StateVector.zero(qubits)`

とする。

エラー文言は spec と合わせる。

- [ ] **Step 4: numeric run scenarios を green にする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_run.feature
```

Expected:

- variable 解決後の numeric run が PASS
- 未束縛 / 非正規化エラーが PASS

- [ ] **Step 5: numeric run 対応をコミットする**

```bash
git add lib/qni/simulator.rb lib/qni/state_vector.rb features/qni_run.feature test/qni/initial_state_test.rb
git commit -m "feat: run circuits from initial state vectors"
```

## Task 6: symbolic run を `initial_state` から開始できるようにする

**Files:**
- Modify: `lib/qni/symbolic_state_renderer.rb`
- Modify: `libexec/qni_symbolic_run.py`
- Modify: `features/qni_run.feature`
- Test: `features/qni_run.feature`

- [ ] **Step 1: symbolic scenario が赤いことを確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_run.feature:385
```

Expected:

- `alpha|0> + beta|1>` を起点にした symbolic run が失敗する

- [ ] **Step 2: Python helper に `initial_state` 読み込みを追加する**

`libexec/qni_symbolic_run.py` で次を行う。

- `circuit_hash.get("initial_state")` を読む
- 指定があれば `Matrix([[coeff_0], [coeff_1]])` を構築する
- 指定がなければ従来どおり `|0>` または `|00>` 開始

第 1 段の coeff は数値または単純な identifier のみでよい。

- [ ] **Step 3: Ruby 側の renderer を変更する**

`lib/qni/symbolic_state_renderer.rb` は大きく変えず、helper へ渡す JSON が `initial_state` を含めるだけで動く形に留める。

- [ ] **Step 4: symbolic run scenarios を green にする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_run.feature
```

Expected:

- `beta|0> + alpha|1>` scenario が PASS
- 既存の symbolic scenario が回帰していない

- [ ] **Step 5: symbolic run 対応をコミットする**

```bash
git add lib/qni/symbolic_state_renderer.rb libexec/qni_symbolic_run.py features/qni_run.feature
git commit -m "feat: support symbolic initial state vectors"
```

## Task 7: feature DSL と kata scenario を initial_state に乗せる

**Files:**
- Modify: `features/step_definitions/cli_steps.rb`
- Modify: `features/katas/basic_gates/state_flip.feature`
- Test: `features/katas/basic_gates/state_flip.feature`

- [ ] **Step 1: `Given 初期状態ベクトルは:` の failing case を追加する**

`features/katas/basic_gates/state_flip.feature` に、必要なら次の scenario を追加する。

```gherkin
Scenario: X ゲートは alpha|0> + beta|1> の振幅を入れ替える
  Given 初期状態ベクトルは:
    """
    alpha|0> + beta|1>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ X ├
        └───┘
    """
  Then 状態ベクトルは:
    """
    beta|0> + alpha|1>
    """
```

- [ ] **Step 2: step definition を `initial_state` JSON 書き込みへ切り替える**

`features/step_definitions/cli_steps.rb` の `Given 初期状態ベクトルは:` は、

- 既存の固定 gate 準備 shortcut を維持してもよい
- ただし `alpha|0> + beta|1>` が来たら `InitialState.parse` を使って `initial_state` を書く

ようにする。

- [ ] **Step 3: kata feature を green にする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/katas/basic_gates/state_flip.feature
```

Expected:

- 既存 4 scenario が PASS
- 追加した `alpha|0> + beta|1>` scenario も PASS

- [ ] **Step 4: DSL 接続をコミットする**

```bash
git add features/step_definitions/cli_steps.rb features/katas/basic_gates/state_flip.feature
git commit -m "feat: support initial state vectors in feature DSL"
```

## Task 8: full verification と仕上げ

**Files:**
- Modify: touched files only
- Test: full project checks

- [ ] **Step 1: symbolic runtime を準備する**

Run:

```bash
bash scripts/setup_symbolic_python.sh
```

Expected:

- Python / SymPy runtime が使える

- [ ] **Step 2: focused checks を実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_state.feature \
  features/qni_run.feature \
  features/qni_cli.feature \
  features/katas/basic_gates/state_flip.feature
```

Expected:

- すべて PASS

- [ ] **Step 3: lint を実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rubocop \
  lib/qni/initial_state.rb \
  lib/qni/circuit.rb \
  lib/qni/circuit_file.rb \
  lib/qni/simulator.rb \
  lib/qni/state_vector.rb \
  lib/qni/symbolic_state_renderer.rb \
  lib/qni/cli.rb \
  lib/qni/cli/state_command.rb \
  lib/qni/cli/state_help.rb \
  features/step_definitions/cli_steps.rb \
  test/qni/initial_state_test.rb
```

Expected:

- no offenses detected

- [ ] **Step 4: full check を実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

Expected:

- PASS

- [ ] **Step 5: 最終コミットを行う**

```bash
git add \
  features/qni_state.feature \
  features/qni_run.feature \
  features/qni_cli.feature \
  features/katas/basic_gates/state_flip.feature \
  features/step_definitions/cli_steps.rb \
  test/qni/initial_state_test.rb \
  lib/qni/initial_state.rb \
  lib/qni/circuit.rb \
  lib/qni/circuit_file.rb \
  lib/qni/simulator.rb \
  lib/qni/state_vector.rb \
  lib/qni/symbolic_state_renderer.rb \
  lib/qni/cli.rb \
  lib/qni/cli/state_command.rb \
  lib/qni/cli/state_help.rb \
  libexec/qni_symbolic_run.py
git commit -m "feat: add initial state vector support"
```

