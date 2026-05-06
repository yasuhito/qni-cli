# シンボリック基底表示の実装計画

> **自律作業エージェント向け:** 必須: この計画を実装するときは superpowers:subagent-driven-development（サブエージェントを使える場合）または superpowers:executing-plans を使う。手順の追跡にはチェックボックス（`- [ ]`）構文を使う。

**目的:** `qni run --symbolic --basis x` と `Then |+>, |-> 基底での状態ベクトルは:` を追加し、BasisChange の機能仕様を `|+>`, `|->` でそのまま読める高レベル表現へ引き上げる。

**構成:** 先に `features/qni_run.feature` と `features/katas/basic_gates/basis_change.feature` を更新して期待値を失敗させ、CLI オプションと Ruby 側の引数受け渡しを最小差分で通す。`symbolic` の基底変換そのものは Python 補助プログラムに閉じ込め、1 量子ビットの `x` 基底だけを v1 として実装する。最後にステップ定義を足して、基底対応の高レベル DSL で読みやすさを仕上げる。

**技術スタック:** Ruby, Thor, Cucumber, Minitest, Bundler, SymPy 補助プログラム (`libexec/qni_symbolic_run.py`), `qni-cli`

---

## ファイル構成

- 変更: `features/qni_run.feature`
  - `qni run --symbolic --basis x` の受け入れ条件を追加する。
- 変更: `features/qni_cli.feature`
  - `qni run --help` に `--basis` が見えることを追加する。
- 変更: `features/katas/basic_gates/basis_change.feature`
  - `0.6|+> + 0.8|->`、`α|+> + β|->` のような期待値に置き換える。
- 変更: `features/step_definitions/cli_steps.rb`
  - `Then |+>, |-> 基底での状態ベクトルは:` を追加する。
- 作成: `test/qni/symbolic_state_renderer_test.rb`
  - レンダラーが `basis: 'x'` を補助プログラムに渡し、1 量子ビットの `x` 基底表示を返せることを単体テストする。
- 変更: `lib/qni/cli.rb`
  - `run` サブコマンドに `--basis` オプションを追加し、`symbolic` 以外では弾く。
- 変更: `lib/qni/simulator.rb`
  - シンボリック表示に基底を渡す入口を追加する。
- 変更: `lib/qni/symbolic_state_renderer.rb`
  - 補助プログラムへ基底引数を渡し、未対応基底 / 量子ビット数のエラーを返せるようにする。
- 変更: `libexec/qni_symbolic_run.py`
  - `--basis x` の引数解析、1 量子ビット状態の `|+>`, `|->` 変換、整形を追加する。

## タスク 1: 機能仕様優先で `x` 基底表示の受け入れ条件を失敗させる

**ファイル:**
- 変更: `features/qni_run.feature`
- 変更: `features/qni_cli.feature`
- 変更: `features/katas/basic_gates/basis_change.feature`
- 検証: `features/qni_run.feature`
- 検証: `features/qni_cli.feature`
- 検証: `features/katas/basic_gates/basis_change.feature`

- [ ] **手順 1: `qni run --symbolic --basis x` の受け入れ条件を追加する**

`features/qni_run.feature` に少なくとも次を追加する。

```gherkin
Scenario: qni run --symbolic --basis x は H ゲートの状態を |+>, |-> で表示
  Given "qni add H --qubit 0 --step 0" を実行
  When "qni run --symbolic --basis x" を実行
  Then 標準出力:
    """
    |+>
    """

Scenario: qni run --symbolic --basis x は alpha|0> + beta|1> に H を適用した結果を |+>, |-> で表示
  Given "qni state set \"alpha|0> + beta|1>\"" を実行
  And "qni add H --qubit 0 --step 0" を実行
  When "qni run --symbolic --basis x" を実行
  Then 標準出力:
    """
    alpha|+> + beta|->
    """

Scenario: qni run --symbolic --basis x は 2 qubit 回路では失敗
  Given 空の 2 qubit 回路がある
  When "qni run --symbolic --basis x" を実行
  Then コマンドは失敗
  And 標準エラー:
    """
    symbolic x-basis run currently supports only 1-qubit circuits
    """

Scenario: qni run --basis x は --symbolic なしでは失敗
  Given 空の 1 qubit 回路がある
  When "qni run --basis x" を実行
  Then コマンドは失敗
  And 標準エラー:
    """
    --basis requires --symbolic
    """
```

このシナリオは、`H|0> = |+>` をそのまま `|+>, |->` 表示で確認する最小ケースとして使う。大事なのは `--basis x` の受け入れ条件を機能仕様で先に固定すること。

- [ ] **手順 2: `qni run --help` に `--basis` を出す受け入れ条件を追加する**

`features/qni_cli.feature` に `run` ヘルプのシナリオを追加する。

```gherkin
Scenario: qni run --help はシンボリック基底オプションを表示
  When "qni run --help" を実行
  Then コマンドは成功
  And 標準出力に次を含む:
    """
    [--basis=BASIS]
    """
  And 標準出力に次を含む:
    """
    [--symbolic] [--basis=BASIS]
    """
```

必要ならオプション説明文も検証する。

- [ ] **手順 3: `basis_change.feature` を理想形の期待値に書き換える**

`features/katas/basic_gates/basis_change.feature` の 3 本目以降を少なくとも次のように更新する。

```gherkin
Scenario: H ゲートは 0.6|0> + 0.8|1> を |+>, |-> 基底で表すと 0.6|+> + 0.8|-> になる
  Given 初期状態ベクトルは:
    """
    0.6|0> + 0.8|1>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ H ├
        └───┘
    """
  Then |+>, |-> 基底での状態ベクトルは:
    """
    0.6|+> + 0.8|->
    """

Scenario: H ゲートは α|0> + β|1> を |+>, |-> 基底で表すと α|+> + β|-> になる
  Given 初期状態ベクトルは:
    """
    α|0> + β|1>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ H ├
        └───┘
    """
  Then |+>, |-> 基底での状態ベクトルは:
    """
    α|+> + β|->
    """
```

既存の `Then 状態ベクトルは:` はこのタスクではまだ未対応なので、ここで失敗するのが正しい。

- [ ] **手順 4: 失敗を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_run.feature \
  features/qni_cli.feature \
  features/katas/basic_gates/basis_change.feature
```

期待結果:

- `--basis` オプション未定義で失敗する
- `|+>, |-> 基底での状態ベクトルは:` 未定義で失敗する
- 失敗理由が入力ミスではなく機能不足になっている

- [ ] **手順 5: 失敗する受け入れ条件をコミットする**

```bash
git add features/qni_run.feature features/qni_cli.feature features/katas/basic_gates/basis_change.feature
git commit -m "test: add symbolic x-basis acceptance"
```

## タスク 2: Ruby 側で `--basis` を受け取りレンダラーへ渡す

**ファイル:**
- 作成: `test/qni/symbolic_state_renderer_test.rb`
- 変更: `lib/qni/cli.rb`
- 変更: `lib/qni/simulator.rb`
- 変更: `lib/qni/symbolic_state_renderer.rb`
- 検証: `test/qni/symbolic_state_renderer_test.rb`

- [ ] **手順 1: レンダラーの単体テストを失敗する形で書く**

`test/qni/symbolic_state_renderer_test.rb` を作成し、少なくとも次を入れる。

```ruby
require 'minitest/autorun'
require_relative '../../lib/qni/symbolic_state_renderer'

module Qni
  class SymbolicStateRendererTest < Minitest::Test
    def test_basis_x_requires_one_qubit
      error = assert_raises(Qni::Simulator::Error) do
        Qni::SymbolicStateRenderer.new(
          { 'qubits' => 2, 'cols' => [[1, 1]] },
          basis: 'x'
        ).render
      end

      assert_equal 'symbolic x-basis run currently supports only 1-qubit circuits', error.message
    end
  end
end
```

必要なら補助プログラム呼び出しの引数を分離して、その非公開メソッドを単体テストしてもよい。ポイントは `basis` の Ruby 側の引数受け渡しを最小で押さえること。

- [ ] **手順 2: 単体テストが失敗することを確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/symbolic_state_renderer_test.rb
```

期待結果:

- `ArgumentError`
- または `NoMethodError`
- または未実装エラー

- [ ] **手順 3: `run --symbolic --basis x` のオプション解析を実装する**

`lib/qni/cli.rb` を更新して、`run` に次を追加する。

```ruby
method_option :basis, type: :string, desc: 'Show a symbolic state in a named basis such as x'
```

さらに `rendered_state_vector` で

- `options[:basis]` があるのに `options[:symbolic]` が false なら `Thor::Error, '--basis requires --symbolic'`
- `options[:symbolic]` のときは `simulator.render_symbolic_state_vector(basis: options[:basis])`

へ変える。

- [ ] **手順 4: `Simulator` と `SymbolicStateRenderer` の引数を通す**

`lib/qni/simulator.rb`

```ruby
def render_symbolic_state_vector(basis: nil)
  SymbolicStateRenderer.new(data, basis:).render
end
```

`lib/qni/symbolic_state_renderer.rb`

- `initialize(circuit_hash, basis: nil)`
- `render_with_format('text')` に basis を渡す
- `basis == 'x' && qubits != 1` のときは
  - `raise Simulator::Error, 'symbolic x-basis run currently supports only 1-qubit circuits'`
- 補助プログラムへは `--basis x` を追加して渡す

CLI では未対応の基底名を早めに弾いてもよいが、最終的な検証はレンダラー側にも残す。

- [ ] **手順 5: Ruby 側の単体テストを成功させる**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/symbolic_state_renderer_test.rb
```

期待結果: 成功

- [ ] **手順 6: Ruby 側の引数受け渡しをコミットする**

```bash
git add test/qni/symbolic_state_renderer_test.rb lib/qni/cli.rb lib/qni/simulator.rb lib/qni/symbolic_state_renderer.rb
git commit -m "feat: add symbolic basis option plumbing"
```

## タスク 3: Python 補助プログラムに `x` 基底変換を追加する

**ファイル:**
- 変更: `libexec/qni_symbolic_run.py`
- 変更: `features/qni_run.feature`
- 検証: `features/qni_run.feature`

- [ ] **手順 1: 補助プログラムの基底解析を実装する**

`libexec/qni_symbolic_run.py` で次を扱えるようにする。

- `parse_output_format(argv)` を `parse_args(argv)` に置き換える
- `--format latex`
- `--basis x`

受け入れる形は第 1 段では次に限定する。

```text
python qni_symbolic_run.py
python qni_symbolic_run.py --format latex
python qni_symbolic_run.py --basis x
python qni_symbolic_run.py --format text --basis x
```

それ以外は `ValueError("unsupported symbolic renderer arguments")` でよい。

- [ ] **手順 2: 1 量子ビットの `x` 基底表示関数を追加する**

`a|0> + b|1>` の 1 量子ビットのシンボリック状態を、

```text
((a + b)/sqrt(2))|+> + ((a - b)/sqrt(2))|->
```

へ変換して整形する関数を追加する。

たとえば:

```python
def render_symbolic_state_x_basis(state):
    zero = simplify(state[0])
    one = simplify(state[1])
    plus = simplify((zero + one) / sqrt(2))
    minus = simplify((zero - one) / sqrt(2))
    return join_terms_for_named_basis([
        (plus, "|+>"),
        (minus, "|->"),
    ])
```

という方向でよい。`join_terms` を基底ラベル付きでも使えるように小さく一般化してもよい。

- [ ] **手順 3: `run()` で基底を切り替える**

`run(circuit, output_format="text", basis=None)` に変えて、

- `basis is None` なら従来どおり
- `basis == "x"` かつ `qubits == 1` なら `render_symbolic_state_x_basis(...)`
- `basis == "x"` かつ `qubits != 1` なら `ValueError("symbolic x-basis run currently supports only 1-qubit circuits")`
- 未対応 basis は `ValueError("unsupported symbolic basis: ...")`

とする。

LaTeX 出力と基底指定の組み合わせは v1 では非対応にしてよい。もし弾くなら仕様に合わせてメッセージを明示する。

- [ ] **手順 4: 結合確認で成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_run.feature
```

期待結果:

- 新しい `--basis x` シナリオが通る
- 既存の `qni run --symbolic` シナリオが壊れていない

- [ ] **手順 5: 補助プログラム実装をコミットする**

```bash
git add libexec/qni_symbolic_run.py features/qni_run.feature
git commit -m "feat: render symbolic states in x basis"
```

## タスク 4: 機能仕様の DSL を仕上げて BasisChange を高レベル化する

**ファイル:**
- 変更: `features/step_definitions/cli_steps.rb`
- 変更: `features/katas/basic_gates/basis_change.feature`
- 検証: `features/katas/basic_gates/basis_change.feature`

- [ ] **手順 1: 新しいステップ定義を失敗する状態から実装する**

`features/step_definitions/cli_steps.rb` に次を追加する。

```ruby
Then('|+>, |-> 基底での状態ベクトルは:') do |doc_string|
  @stdout, @stderr, @status = run_qni_command(@scenario_dir, 'qni run --symbolic --basis x')
  assert_command_succeeded!(@status, @stdout, @stderr)
  assert_symbolic_state_matches!(@stdout, doc_string)
end
```

既存の `canonical_symbolic_notation` は `|+>`, `|->`, `α`, `β`, `θ`, `π`, `√2` をすでに吸収しているので、必要最低限の拡張だけにとどめる。

- [ ] **手順 2: `basis_change.feature` の期待値を成功状態に合わせて整える**

`features/katas/basic_gates/basis_change.feature` のシナリオ名と期待値を、表示形式に合わせて最終調整する。

候補:

```gherkin
Scenario: H ゲートは 0.6|0> + 0.8|1> を |+>, |-> 基底で表すと 0.6|+> + 0.8|-> になる
Scenario: H ゲートは実数係数の一般状態を |+>, |-> 基底で表す
Scenario: H ゲートは α|0> + β|1> を |+>, |-> 基底で表すと α|+> + β|-> になる
```

ここでは `X basis` という言葉を機能仕様から外し、読みやすさを優先する。

- [ ] **手順 3: 対象機能仕様を成功させる**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_run.feature \
  features/qni_cli.feature \
  features/katas/basic_gates/basis_change.feature
```

期待結果: 成功

- [ ] **手順 4: 全体確認をする**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

期待結果:

- `259 scenarios` から必要分だけ増えた最新件数で成功
- RuboCop / Reek / Cucumber がすべて通る

- [ ] **手順 5: 仕上げをコミットする**

```bash
git add features/step_definitions/cli_steps.rb features/katas/basic_gates/basis_change.feature features/qni_cli.feature
git commit -m "test: rewrite basis change around x-basis display"
```

## 実装者向けメモ

- `features/*.feature` を先に変える。`AGENTS.md` のルールを守ること。
- v1 では 1 量子ビットの `x` 基底だけで十分。2 量子ビットの基底展開へ手を広げない。
- `|+>`, `|->` は機能仕様上の読みやすい記法であり、内部状態モデルを変更する話ではない。
- 既存の `qni export --state-vector` はこの計画の対象外。基底対応の LaTeX 書き出しは後回しにする。
- Python 補助プログラムの引数解析を広げるときは、既存の `--format latex` を壊さないこと。
