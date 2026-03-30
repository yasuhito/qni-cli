# Symbolic Basis Display Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `qni run --symbolic --basis x` と `Then |+>, |-> 基底での状態ベクトルは:` を追加し、BasisChange の feature を `|+>`, `|->` でそのまま読める高レベル表現へ引き上げる。

**Architecture:** 先に `features/qni_run.feature` と `features/katas/basic_gates/basis_change.feature` を更新して期待値を赤くし、CLI option と Ruby 側の引数受け渡しを最小差分で通す。symbolic の基底変換そのものは Python helper に閉じ込め、1 qubit の `x` 基底だけを v1 として実装する。最後に feature step を足して、basis-aware な高レベル DSL で読みやすさを仕上げる。

**Tech Stack:** Ruby, Thor, Cucumber, Minitest, Bundler, SymPy helper (`libexec/qni_symbolic_run.py`), `qni-cli`

---

## File Structure

- Modify: `features/qni_run.feature`
  - `qni run --symbolic --basis x` の acceptance を追加する。
- Modify: `features/qni_cli.feature`
  - `qni run --help` に `--basis` が見えることを追加する。
- Modify: `features/katas/basic_gates/basis_change.feature`
  - `0.6|+> + 0.8|->`、`α|+> + β|->` のような期待値に置き換える。
- Modify: `features/step_definitions/cli_steps.rb`
  - `Then |+>, |-> 基底での状態ベクトルは:` を追加する。
- Create: `test/qni/symbolic_state_renderer_test.rb`
  - renderer が `basis: 'x'` を helper に渡し、1 qubit の `x` 基底表示を返せることを unit test する。
- Modify: `lib/qni/cli.rb`
  - `run` サブコマンドに `--basis` option を追加し、symbolic 以外では弾く。
- Modify: `lib/qni/simulator.rb`
  - symbolic rendering に basis を渡す入口を追加する。
- Modify: `lib/qni/symbolic_state_renderer.rb`
  - helper へ basis 引数を渡し、未対応 basis / qubit 数のエラーを返せるようにする。
- Modify: `libexec/qni_symbolic_run.py`
  - `--basis x` の引数 parse、1 qubit state の `|+>`, `|->` 変換、整形を追加する。

## Task 1: feature-first で `x` 基底表示の受け入れを赤くする

**Files:**
- Modify: `features/qni_run.feature`
- Modify: `features/qni_cli.feature`
- Modify: `features/katas/basic_gates/basis_change.feature`
- Test: `features/qni_run.feature`
- Test: `features/qni_cli.feature`
- Test: `features/katas/basic_gates/basis_change.feature`

- [ ] **Step 1: `qni run --symbolic --basis x` の acceptance を追加する**

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

この scenario は、`H|0> = |+>` をそのまま `|+>, |->` 表示で確認する最小ケースとして使う。大事なのは `--basis x` の acceptance を feature で先に固定すること。

- [ ] **Step 2: `qni run --help` に `--basis` を出す acceptance を追加する**

`features/qni_cli.feature` に `run` help scenario を追加する。

```gherkin
Scenario: qni run --help は symbolic basis option を表示
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

必要なら option 説明文も assertion する。

- [ ] **Step 3: `basis_change.feature` を理想形の期待値に書き換える**

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

既存の `Then 状態ベクトルは:` はこの task ではまだ未対応なので、ここで赤くなるのが正しい。

- [ ] **Step 4: red を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_run.feature \
  features/qni_cli.feature \
  features/katas/basic_gates/basis_change.feature
```

Expected:

- `--basis` option 未定義で赤くなる
- `|+>, |-> 基底での状態ベクトルは:` 未定義で赤くなる
- 失敗理由が typo ではなく機能不足になっている

- [ ] **Step 5: red をコミットする**

```bash
git add features/qni_run.feature features/qni_cli.feature features/katas/basic_gates/basis_change.feature
git commit -m "test: add symbolic x-basis acceptance"
```

## Task 2: Ruby 側で `--basis` を受け取り renderer へ渡す

**Files:**
- Create: `test/qni/symbolic_state_renderer_test.rb`
- Modify: `lib/qni/cli.rb`
- Modify: `lib/qni/simulator.rb`
- Modify: `lib/qni/symbolic_state_renderer.rb`
- Test: `test/qni/symbolic_state_renderer_test.rb`

- [ ] **Step 1: renderer の unit test を赤く書く**

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

必要なら helper 呼び出し引数を分離して、その private method を unit test してもよい。ポイントは `basis` の Ruby 側 plumbing を最小で押さえること。

- [ ] **Step 2: unit test が赤いことを確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/symbolic_state_renderer_test.rb
```

Expected:

- `ArgumentError`
- または `NoMethodError`
- または未実装 error

- [ ] **Step 3: `run --symbolic --basis x` の option parsing を実装する**

`lib/qni/cli.rb` を更新して、`run` に次を追加する。

```ruby
method_option :basis, type: :string, desc: 'Show a symbolic state in a named basis such as x'
```

さらに `rendered_state_vector` で

- `options[:basis]` があるのに `options[:symbolic]` が false なら `Thor::Error, '--basis requires --symbolic'`
- `options[:symbolic]` のときは `simulator.render_symbolic_state_vector(basis: options[:basis])`

へ変える。

- [ ] **Step 4: `Simulator` と `SymbolicStateRenderer` の引数を通す**

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
- helper へは `--basis x` を追加して渡す

CLI では未対応 basis 名を早めに弾いてもよいが、最終的な validation は renderer 側にも残す。

- [ ] **Step 5: Ruby 側の unit test を green にする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/symbolic_state_renderer_test.rb
```

Expected: PASS

- [ ] **Step 6: Ruby plumbing をコミットする**

```bash
git add test/qni/symbolic_state_renderer_test.rb lib/qni/cli.rb lib/qni/simulator.rb lib/qni/symbolic_state_renderer.rb
git commit -m "feat: add symbolic basis option plumbing"
```

## Task 3: Python helper に `x` 基底変換を追加する

**Files:**
- Modify: `libexec/qni_symbolic_run.py`
- Modify: `features/qni_run.feature`
- Test: `features/qni_run.feature`

- [ ] **Step 1: helper の basis parse を実装する**

`libexec/qni_symbolic_run.py` に

- `parse_output_format(argv)` を `parse_args(argv)` に置き換える
- `--format latex`
- `--basis x`

の両方を読めるようにする。

受け入れる形は第 1 段では次に限定する。

```text
python qni_symbolic_run.py
python qni_symbolic_run.py --format latex
python qni_symbolic_run.py --basis x
python qni_symbolic_run.py --format text --basis x
```

それ以外は `ValueError("unsupported symbolic renderer arguments")` でよい。

- [ ] **Step 2: 1 qubit の `x` 基底表示関数を追加する**

`a|0> + b|1>` の 1 qubit symbolic state を、

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

という方向でよい。`join_terms` を basis label 付きでも使えるように小さく一般化してもよい。

- [ ] **Step 3: `run()` で basis を切り替える**

`run(circuit, output_format="text", basis=None)` に変えて、

- `basis is None` なら従来どおり
- `basis == "x"` かつ `qubits == 1` なら `render_symbolic_state_x_basis(...)`
- `basis == "x"` かつ `qubits != 1` なら `ValueError("symbolic x-basis run currently supports only 1-qubit circuits")`
- 未対応 basis は `ValueError("unsupported symbolic basis: ...")`

とする。

latex 出力と basis 指定の組み合わせは v1 では非対応にしてよい。もし弾くなら spec に合わせてメッセージを明示する。

- [ ] **Step 4: integration で green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_run.feature
```

Expected:

- 新しい `--basis x` scenario が通る
- 既存の `qni run --symbolic` scenario が壊れていない

- [ ] **Step 5: helper 実装をコミットする**

```bash
git add libexec/qni_symbolic_run.py features/qni_run.feature
git commit -m "feat: render symbolic states in x basis"
```

## Task 4: feature DSL を仕上げて BasisChange を高レベル化する

**Files:**
- Modify: `features/step_definitions/cli_steps.rb`
- Modify: `features/katas/basic_gates/basis_change.feature`
- Test: `features/katas/basic_gates/basis_change.feature`

- [ ] **Step 1: 新しい step を赤から実装する**

`features/step_definitions/cli_steps.rb` に次を追加する。

```ruby
Then('|+>, |-> 基底での状態ベクトルは:') do |doc_string|
  @stdout, @stderr, @status = run_qni_command(@scenario_dir, 'qni run --symbolic --basis x')
  assert_command_succeeded!(@status, @stdout, @stderr)
  assert_symbolic_state_matches!(@stdout, doc_string)
end
```

既存の `canonical_symbolic_notation` は `|+>`, `|->`, `α`, `β`, `θ`, `π`, `√2` をすでに吸収しているので、必要最低限の拡張だけにとどめる。

- [ ] **Step 2: `basis_change.feature` の期待値を green に合わせて整える**

`features/katas/basic_gates/basis_change.feature` の scenario 名と期待値を、表示形式に合わせて最終調整する。

候補:

```gherkin
Scenario: H ゲートは 0.6|0> + 0.8|1> を |+>, |-> 基底で表すと 0.6|+> + 0.8|-> になる
Scenario: H ゲートは実数係数の一般状態を |+>, |-> 基底で表す
Scenario: H ゲートは α|0> + β|1> を |+>, |-> 基底で表すと α|+> + β|-> になる
```

ここでは `X basis` という言葉を feature から外し、読みやすさを優先する。

- [ ] **Step 3: 対象 feature を green にする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_run.feature \
  features/qni_cli.feature \
  features/katas/basic_gates/basis_change.feature
```

Expected: PASS

- [ ] **Step 4: 全体確認をする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

Expected:

- `259 scenarios` から必要分だけ増えた最新件数で PASS
- RuboCop / Reek / Cucumber がすべて通る

- [ ] **Step 5: 仕上げをコミットする**

```bash
git add features/step_definitions/cli_steps.rb features/katas/basic_gates/basis_change.feature features/qni_cli.feature
git commit -m "test: rewrite basis change around x-basis display"
```

## Notes for the Implementer

- `features/*.feature` を先に変える。`AGENTS.md` のルールを守ること。
- v1 では 1 qubit の `x` 基底だけで十分。2 qubit の basis 展開へ手を広げない。
- `|+>`, `|->` は feature 上の読みやすい記法であり、内部 state model を変更する話ではない。
- 既存の `qni export --state-vector` はこの plan の対象外。basis-aware な LaTeX export は後回しにする。
- Python helper の引数 parse を広げるときは、既存の `--format latex` を壊さないこと。
