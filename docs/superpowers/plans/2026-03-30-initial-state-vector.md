# 初期状態ベクトル実装計画

> **エージェント作業者向け:** 必須: この計画の実装には superpowers:subagent-driven-development（サブエージェントが使える場合）または superpowers:executing-plans を使う。手順の追跡にはチェックボックス（`- [ ]`）記法を使う。

**目的:** 1 qubit の初期状態ベクトルを `qni` の正式機能として追加し、CLI・`circuit.json`・数値実行・記号実行・機能仕様 DSL から一貫して扱えるようにする。

**構成方針:** まず機能仕様を先に書く方針で、`qni state` CLI と `initial_state` 付き実行の受け入れ条件を失敗させる。次に `InitialState` モデルを追加して `Circuit`/`CircuitFile` の JSON 経路へ組み込み、数値実行と記号実行をそれぞれ既存経路に最小差分で接続する。数値実行は既存の `StateVector` を維持し、記号実行だけ SymPy ベースの初期状態評価を追加する。

**技術要素:** Ruby, Cucumber, Minitest, Bundler, SymPy 補助プログラム (`libexec/qni_symbolic_run.py`), `qni-cli`

---

## ファイル構成

- 作成: `features/qni_state.feature`
  - `qni state set/show/clear` の受け入れ条件を追加する。
- 変更: `features/qni_run.feature`
  - `initial_state` 付き記号実行 / 数値実行 / 検証失敗を追加する。
- 変更: `features/katas/basic_gates/state_flip.feature`
  - 必要なら `alpha|0> + beta|1>` を使う高レベルシナリオを追加する。
- 変更: `features/step_definitions/cli_steps.rb`
  - `Given 初期状態ベクトルは:` で `alpha|0> + beta|1>` を `initial_state` JSON に落とせるようにする。
- 作成: `test/qni/initial_state_test.rb`
  - `InitialState` の `parse` / JSON 往復変換 / 数値解決 / 検証を単体テストする。
- 作成: `lib/qni/initial_state.rb`
  - 1 qubit 初期状態の解析 / 正規化 / JSON 出力 / 数値解決を担当する。
- 変更: `lib/qni/circuit.rb`
  - `initial_state` を保持し、`to_h` / `from_h` に組み込む。
- 変更: `lib/qni/circuit_file.rb`
  - `initial_state` を読む / 書くユーティリティを追加する。
- 変更: `lib/qni/simulator.rb`
  - ゼロ状態ではなく `initial_state` から開始できるようにする。
- 変更: `lib/qni/state_vector.rb`
  - 必要なら任意の振幅から構築する補助を追加する。
- 変更: `lib/qni/symbolic_state_renderer.rb`
  - 補助プログラムへ `initial_state` 付き JSON を渡すだけに留める。
- 変更: `libexec/qni_symbolic_run.py`
  - `initial_state` を SymPy ベクトルへ変換し、そこからゲートを適用できるようにする。
- 変更: `lib/qni/cli.rb`
  - `state` サブコマンドを登録する。
- 作成: `lib/qni/cli/state_command.rb`
  - `set/show/clear` の実装本体を持つ。
- 作成: `lib/qni/cli/state_help.rb`
  - `qni state` のヘルプ文を持つ。
- 変更: `features/qni_cli.feature`
  - `qni state` のヘルプと使用方法の受け入れ条件を追加する。

## タスク 1: CLI と実行の受け入れ条件を先に失敗させる

**ファイル:**
- 作成: `features/qni_state.feature`
- 変更: `features/qni_run.feature`
- 変更: `features/qni_cli.feature`
- テスト: `features/qni_state.feature`
- テスト: `features/qni_run.feature`
- テスト: `features/qni_cli.feature`

- [ ] **手順 1: `qni state` の機能仕様を追加する**

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

- [ ] **手順 2: `qni run` の受け入れ条件を追加する**

`features/qni_run.feature` に次のシナリオを追加する。

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

既存ステップで足りない検証は後続タスクで追加する。

- [ ] **手順 3: CLI ヘルプの受け入れ条件を追加する**

`features/qni_cli.feature` に `qni state` のヘルプシナリオを追加する。

```gherkin
Scenario: qni state help は初期状態ベクトルの設定方法を表示
  When "qni help state" を実行
  Then 標準出力に次を含む:
    """
    qni state set "alpha|0> + beta|1>"
    """
```

- [ ] **手順 4: 失敗を確認する**

実行コマンド:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_state.feature \
  features/qni_run.feature \
  features/qni_cli.feature
```

期待結果:

- `qni state` 未実装で赤くなる
- `initial_state` 未対応で赤くなる
- 失敗理由が入力誤りではなく機能不足に対応している

- [ ] **手順 5: 機能仕様先行の失敗確認をコミットする**

```bash
git add features/qni_state.feature features/qni_run.feature features/qni_cli.feature
git commit -m "test: add initial state vector acceptance"
```

## タスク 2: `InitialState` モデルを追加する

**ファイル:**
- 作成: `test/qni/initial_state_test.rb`
- 作成: `lib/qni/initial_state.rb`
- テスト: `test/qni/initial_state_test.rb`

- [ ] **手順 1: 単体テストを失敗する状態で書く**

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

- [ ] **手順 2: 単体テストが失敗することを確認する**

実行コマンド:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
```

期待結果:

- `LoadError` または `NameError`

- [ ] **手順 3: `InitialState` の最小実装を書く**

`lib/qni/initial_state.rb` に次を実装する。

- `parse(string)`
- `from_h(hash)`
- `to_h`
- `resolve_numeric(variables)`
- `default_for(qubits)` は第 1 段では 1 qubit の `|0>` のみ

第 1 段の解析対象は次のみに限定する。

```ruby
'alpha|0> + beta|1>'
'0.6|0> + 0.8|1>'
'|0>'
'|1>'
```

検証:

- `basis` は `0` と `1` のみ
- 項数は 1 か 2
- 数値実行では全係数が解決できる
- ノルム 1 を満たす

- [ ] **手順 4: 単体テストを成功させる**

実行コマンド:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
```

期待結果:

- 成功する

- [ ] **手順 5: `InitialState` モデルをコミットする**

```bash
git add test/qni/initial_state_test.rb lib/qni/initial_state.rb
git commit -m "feat: add initial state model"
```

## タスク 3: `Circuit` と `CircuitFile` に `initial_state` を通す

**ファイル:**
- 変更: `lib/qni/circuit.rb`
- 変更: `lib/qni/circuit_file.rb`
- 変更: `test/qni/initial_state_test.rb`
- テスト: `test/qni/initial_state_test.rb`
- テスト: `features/qni_state.feature`

- [ ] **手順 1: JSON 往復変換の失敗するテストを追加する**

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

- [ ] **手順 2: `Circuit` に `initial_state` を追加する**

`lib/qni/circuit.rb` で次を行う。

- `initialize(qubits:, steps:, variables:, initial_state: nil)`
- `attributes_from` で `initial_state` を読む
- `to_h` で `initial_state` を書く
- 指定がなければ従来どおり `nil`

- [ ] **手順 3: `CircuitFile` に状態アクセサを追加する**

`lib/qni/circuit_file.rb` に少なくとも次の補助メソッドを追加する。

```ruby
def set_initial_state(initial_state:)
def clear_initial_state
```

これらは既存の `circuit.json` を壊さず更新する。

- [ ] **手順 4: `qni_state.feature` の JSON 保存シナリオを成功させる**

実行コマンド:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_state.feature
```

期待結果:

- `state set` の保存確認以外はまだ赤でもよい

- [ ] **手順 5: JSON 経路の変更をコミットする**

```bash
git add lib/qni/circuit.rb lib/qni/circuit_file.rb test/qni/initial_state_test.rb features/qni_state.feature
git commit -m "feat: persist initial state in circuit JSON"
```

## タスク 4: `qni state` CLI を実装する

**ファイル:**
- 変更: `lib/qni/cli.rb`
- 作成: `lib/qni/cli/state_command.rb`
- 作成: `lib/qni/cli/state_help.rb`
- 変更: `features/qni_cli.feature`
- テスト: `features/qni_state.feature`
- テスト: `features/qni_cli.feature`

- [ ] **手順 1: ヘルプ / 振り分けの失敗する期待値を確認する**

実行コマンド:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_state.feature \
  features/qni_cli.feature
```

期待結果:

- `qni state` が unknown command で失敗する

- [ ] **手順 2: `state` サブコマンドを登録する**

`lib/qni/cli.rb` で `state` サブコマンドを追加し、既存の `variable` と同じパターンでヘルプと振り分けをつなぐ。

- [ ] **手順 3: `StateCommand` を実装する**

`lib/qni/cli/state_command.rb` に次を実装する。

- `set`
- `show`
- `clear`

`set` は `InitialState.parse` を使い、`CircuitFile#set_initial_state` を呼ぶ。

- [ ] **手順 4: ヘルプ文を追加する**

`lib/qni/cli/state_help.rb` に使用方法の文を書く。

最低限、次の例を入れる。

```text
qni state set "alpha|0> + beta|1>"
qni state show
qni state clear
```

- [ ] **手順 5: `qni state` の受け入れ条件を成功させる**

実行コマンド:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_state.feature \
  features/qni_cli.feature
```

期待結果:

- `qni state set/show/clear` が成功する
- ヘルプシナリオが成功する

- [ ] **手順 6: CLI 実装をコミットする**

```bash
git add lib/qni/cli.rb lib/qni/cli/state_command.rb lib/qni/cli/state_help.rb features/qni_state.feature features/qni_cli.feature
git commit -m "feat: add qni state command"
```

## タスク 5: 数値実行を `initial_state` から開始できるようにする

**ファイル:**
- 変更: `lib/qni/simulator.rb`
- 変更: `lib/qni/state_vector.rb`
- 変更: `features/qni_run.feature`
- テスト: `features/qni_run.feature`
- テスト: `test/qni/initial_state_test.rb`

- [ ] **手順 1: 数値実行の失敗するシナリオを絞って実行する**

実行コマンド:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_run.feature:390
```

期待結果:

- `initial_state` を無視するか未対応で赤い

- [ ] **手順 2: `StateVector` の構築補助を追加する**

`lib/qni/state_vector.rb` に、振幅配列から 1 qubit 状態を構築する安全なクラスメソッドを追加する。

```ruby
def self.from_amplitudes(qubits:, amplitudes:)
  new(qubits:, amplitudes:)
end
```

必要なら長さ検証もここで行う。

- [ ] **手順 3: `Simulator` が初期状態から開始するようにする**

`lib/qni/simulator.rb` の実行経路で、

- `circuit_hash['initial_state']` があれば `InitialState.from_h(...).resolve_numeric(variables)` を使う
- そこから `StateVector.from_amplitudes` を作る
- なければ `StateVector.zero(qubits)`

とする。

エラー文言は仕様と合わせる。

- [ ] **手順 4: 数値実行シナリオを成功させる**

実行コマンド:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_run.feature
```

期待結果:

- 変数解決後の数値実行が成功する
- 未束縛 / 非正規化エラーが成功する

- [ ] **手順 5: 数値実行対応をコミットする**

```bash
git add lib/qni/simulator.rb lib/qni/state_vector.rb features/qni_run.feature test/qni/initial_state_test.rb
git commit -m "feat: run circuits from initial state vectors"
```

## タスク 6: 記号実行を `initial_state` から開始できるようにする

**ファイル:**
- 変更: `lib/qni/symbolic_state_renderer.rb`
- 変更: `libexec/qni_symbolic_run.py`
- 変更: `features/qni_run.feature`
- テスト: `features/qni_run.feature`

- [ ] **手順 1: 記号実行シナリオが失敗することを確認する**

実行コマンド:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_run.feature:385
```

期待結果:

- `alpha|0> + beta|1>` を起点にした記号実行が失敗する

- [ ] **手順 2: Python 補助プログラムに `initial_state` 読み込みを追加する**

`libexec/qni_symbolic_run.py` で次を行う。

- `circuit_hash.get("initial_state")` を読む
- 指定があれば `Matrix([[coeff_0], [coeff_1]])` を構築する
- 指定がなければ従来どおり `|0>` または `|00>` 開始

第 1 段の `coeff` は数値または単純な識別子のみでよい。

- [ ] **手順 3: Ruby 側の出力処理を変更する**

`lib/qni/symbolic_state_renderer.rb` は大きく変えず、補助プログラムへ渡す JSON が `initial_state` を含めるだけで動く形に留める。

- [ ] **手順 4: 記号実行シナリオを成功させる**

実行コマンド:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_run.feature
```

期待結果:

- `beta|0> + alpha|1>` シナリオが成功する
- 既存の記号実行シナリオが回帰していない

- [ ] **手順 5: 記号実行対応をコミットする**

```bash
git add lib/qni/symbolic_state_renderer.rb libexec/qni_symbolic_run.py features/qni_run.feature
git commit -m "feat: support symbolic initial state vectors"
```

## タスク 7: 機能仕様 DSL と kata シナリオを `initial_state` に乗せる

**ファイル:**
- 変更: `features/step_definitions/cli_steps.rb`
- 変更: `features/katas/basic_gates/state_flip.feature`
- テスト: `features/katas/basic_gates/state_flip.feature`

- [ ] **手順 1: `Given 初期状態ベクトルは:` の失敗するケースを追加する**

`features/katas/basic_gates/state_flip.feature` に、必要なら次のシナリオを追加する。

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

- [ ] **手順 2: ステップ定義を `initial_state` JSON 書き込みへ切り替える**

`features/step_definitions/cli_steps.rb` の `Given 初期状態ベクトルは:` は、

- 既存の固定ゲート準備のショートカットを維持してもよい
- ただし `alpha|0> + beta|1>` が来たら `InitialState.parse` を使って `initial_state` を書く

ようにする。

- [ ] **手順 3: kata 機能仕様を成功させる**

実行コマンド:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/katas/basic_gates/state_flip.feature
```

期待結果:

- 既存 4 シナリオが成功する
- 追加した `alpha|0> + beta|1>` シナリオも成功する

- [ ] **手順 4: DSL 接続をコミットする**

```bash
git add features/step_definitions/cli_steps.rb features/katas/basic_gates/state_flip.feature
git commit -m "feat: support initial state vectors in feature DSL"
```

## タスク 8: 全体検証と仕上げ

**ファイル:**
- 変更: 触ったファイルのみ
- テスト: プロジェクト全体のチェック

- [ ] **手順 1: 記号実行環境を準備する**

実行コマンド:

```bash
bash scripts/setup_symbolic_python.sh
```

期待結果:

- Python / SymPy 実行環境が使える

- [ ] **手順 2: 対象を絞ったチェックを実行する**

実行コマンド:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_state.feature \
  features/qni_run.feature \
  features/qni_cli.feature \
  features/katas/basic_gates/state_flip.feature
```

期待結果:

- すべて成功する

- [ ] **手順 3: lint を実行する**

実行コマンド:

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

期待結果:

- no offenses detected

- [ ] **手順 4: 全体チェックを実行する**

実行コマンド:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

期待結果:

- 成功する

- [ ] **手順 5: 最終コミットを行う**

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
