# Bell State Change 1 High-Level DSL Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bell 基底 shorthand と `qni run --symbolic --basis bell` を追加し、`bell_state_change_1.feature` を Bell 基底のまま読める高レベル DSL に書き換える。

**Architecture:** 既存の `|+>` / `|+i>` と同じ考え方で、Bell 状態を `InitialState` と symbolic renderer の user-facing shorthand にする。実装は 3 段に分ける: まず 2 qubit 初期状態と Bell shorthand の parse/save、次に Bell 基底表示、最後に Task 1.8 feature の高レベル化。各段で acceptance を先に赤くしてから最小実装で通す。

**Tech Stack:** Ruby (`Qni::InitialState`, Cucumber, Minitest), Python (`libexec/qni_symbolic_run.py`, SymPy), existing qni CLI / feature DSL

---

## File Map

### Core state parsing and storage

- Modify: `/home/yasuhito/Work/qni-cli/lib/qni/initial_state.rb`
  - 1 qubit 専用だった `InitialState` を 2 qubit Bell shorthand と 2 qubit ket sum まで広げる
- Modify: `/home/yasuhito/Work/qni-cli/test/qni/initial_state_test.rb`
  - Bell shorthand と 2 qubit numeric resolution の unit test を追加する

### Symbolic rendering and CLI acceptance

- Modify: `/home/yasuhito/Work/qni-cli/libexec/qni_symbolic_run.py`
  - `--basis bell` の symbolic 表示を追加する
- Modify: `/home/yasuhito/Work/qni-cli/lib/qni/cli/run_help.rb`
  - `--basis bell` を help に反映する
- Modify: `/home/yasuhito/Work/qni-cli/features/qni_run.feature`
  - `qni run --symbolic --basis bell` の acceptance を追加する
- Modify: `/home/yasuhito/Work/qni-cli/features/qni_cli.feature`
  - `qni run --help` に Bell basis を反映する acceptance を追加する
- Modify: `/home/yasuhito/Work/qni-cli/features/qni_state.feature`
  - Bell shorthand の保存・表示 acceptance を追加する

### Feature DSL and kata rewrite

- Modify: `/home/yasuhito/Work/qni-cli/features/step_definitions/cli_steps.rb`
  - `Then Bell 基底での状態ベクトルは:` を追加する
  - `Given 初期状態ベクトルは:` が 2 qubit `InitialState` をそのまま書けることを確認する
- Modify: `/home/yasuhito/Work/qni-cli/features/katas/basic_gates/bell_state_change_1.feature`
  - low-level scenario を高レベル DSL に書き換える

## Task 1: Bell shorthand の acceptance を先に赤くする

**Files:**
- Modify: `/home/yasuhito/Work/qni-cli/features/qni_state.feature`
- Modify: `/home/yasuhito/Work/qni-cli/test/qni/initial_state_test.rb`

- [ ] **Step 1: `features/qni_state.feature` に Bell shorthand の failing acceptance を追加する**

```gherkin
Scenario: qni state set は |Φ+> を shorthand のまま表示できる初期状態として保存する
  When "qni state set \"|Φ+>\"" を実行
  Then コマンドは成功
  And "qni state show" を実行
  And 標準出力:
    """
    |Φ+>
    """
```

同様に `|Φ->`, `|Ψ+>`, `|Ψ->` と、少なくとも 1 本の線形結合 `alpha|Φ+> + beta|Φ->` も追加する。

- [ ] **Step 2: `test/qni/initial_state_test.rb` に Bell shorthand の failing unit test を追加する**

```ruby
def test_parse_phi_plus_state_shorthand
  initial_state = InitialState.parse('|Φ+>')

  assert_equal '|Φ+>', initial_state.to_s
  assert_equal [Math.sqrt(0.5), 0.0, 0.0, Math.sqrt(0.5)], initial_state.resolve_numeric({})
end
```

`|Φ->`, `|Ψ+>`, `|Ψ->` のうち少なくとも 1〜2 本を対で追加し、2 qubit の shape が見えるようにする。

- [ ] **Step 3: Red を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_state.feature
```

Expected:
- `InitialState` が 1 qubit 専用前提のため FAIL
- Bell shorthand 未対応で FAIL

- [ ] **Step 4: `lib/qni/initial_state.rb` を最小実装で広げる**

実装方針:
- `Term` の `basis` を `0/1` 固定から `0`, `1`, `00`, `01`, `10`, `11` を受ける形へ広げる
- state dimension を `terms` の basis 長から求める
- Bell shorthand を `special_state_for` へ追加する
- `to_s` は既存 1 qubit shorthand を壊さず、Bell shorthand にも戻せるようにする
- `resolve_numeric` は 2 qubit なら 4 要素配列を返す

最小の実装イメージ:

```ruby
when '|Φ+>' then bell_state('00' => PLUS_MINUS_COEFFICIENT_TEXT, '11' => PLUS_MINUS_COEFFICIENT_TEXT)
```

- [ ] **Step 5: Green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest test/qni/initial_state_test.rb
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_state.feature
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add test/qni/initial_state_test.rb features/qni_state.feature lib/qni/initial_state.rb
git commit -m "feat: add Bell initial state shorthand"
```

## Task 2: `qni run --symbolic --basis bell` を追加する

**Files:**
- Modify: `/home/yasuhito/Work/qni-cli/features/qni_run.feature`
- Modify: `/home/yasuhito/Work/qni-cli/features/qni_cli.feature`
- Modify: `/home/yasuhito/Work/qni-cli/libexec/qni_symbolic_run.py`
- Modify: `/home/yasuhito/Work/qni-cli/lib/qni/cli/run_help.rb`

- [ ] **Step 1: `features/qni_run.feature` に Bell basis の failing acceptance を追加する**

少なくとも次の 3 本を追加する。

```gherkin
Scenario: qni run --symbolic --basis bell は |Φ+> を |Φ+> と表示
  Given "qni state set \"|Φ+>\"" を実行
  When "qni run --symbolic --basis bell" を実行
  Then 標準出力:
    """
    |Φ+>
    """
```

```gherkin
Scenario: qni run --symbolic --basis bell は Z を適用した |Φ+> を |Φ-> と表示
  Given "qni state set \"|Φ+>\"" を実行
  And "qni add Z --qubit 0 --step 0" を実行
  When "qni run --symbolic --basis bell" を実行
  Then 標準出力:
    """
    |Φ->
    """
```

```gherkin
Scenario: qni run --symbolic --basis bell は α|Φ+> + β|Φ-> を表示
  Given "qni state set \"alpha|Φ+> + beta|Φ->\"" を実行
  When "qni run --symbolic --basis bell" を実行
  Then 標準出力:
    """
    alpha|Φ+> + beta|Φ->
    """
```

必要なら 1 qubit で失敗する scenario も追加する。

- [ ] **Step 2: `features/qni_cli.feature` に help の failing acceptance を追加する**

```gherkin
And 標準出力に次を含む:
  """
  Show a symbolic state in a named basis such as x, y, or bell
  """
```

- [ ] **Step 3: Red を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_run.feature features/qni_cli.feature
```

Expected:
- `unsupported symbolic basis: bell` で FAIL
- help 文言不一致で FAIL

- [ ] **Step 4: `libexec/qni_symbolic_run.py` に Bell basis 表示を追加する**

実装方針:
- `render_symbolic_state_bell_basis(state)` を新設する
- 2 qubit state `(a, b, c, d)` を
  - `(a + d)/sqrt(2)` → `|Φ+>`
  - `(a - d)/sqrt(2)` → `|Φ->`
  - `(b + c)/sqrt(2)` → `|Ψ+>`
  - `(b - c)/sqrt(2)` → `|Ψ->`
  へ変換する
- `render_named_basis_term` は 2 qubit named basis label にも再利用できるようにする
- `run(..., basis="bell")` を 2 qubit text-only に限定して追加する

最小の関数イメージ:

```python
def render_symbolic_state_bell_basis(state):
    a, b, c, d = [simplify(term) for term in state]
    bell_terms = (
        (simplify((a + d) / sqrt(2)), "|Φ+>"),
        (simplify((a - d) / sqrt(2)), "|Φ->"),
        (simplify((b + c) / sqrt(2)), "|Ψ+>"),
        (simplify((b - c) / sqrt(2)), "|Ψ->"),
    )
```

- [ ] **Step 5: `lib/qni/cli/run_help.rb` を更新する**

`x or y` を `x, y, or bell` に更新し、2 qubit Bell basis をサポートすることが help から読めるようにする。

- [ ] **Step 6: Green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/qni_run.feature features/qni_cli.feature
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add features/qni_run.feature features/qni_cli.feature libexec/qni_symbolic_run.py lib/qni/cli/run_help.rb
git commit -m "feat: add Bell basis symbolic output"
```

## Task 3: Bell 基底 step を追加して Task 1.8 を高レベル化する

**Files:**
- Modify: `/home/yasuhito/Work/qni-cli/features/step_definitions/cli_steps.rb`
- Modify: `/home/yasuhito/Work/qni-cli/features/katas/basic_gates/bell_state_change_1.feature`

- [ ] **Step 1: `bell_state_change_1.feature` を先に高レベル DSL へ書き換える**

目標 shape:

```gherkin
Scenario: Z ゲートは |Φ+> を |Φ-> に変える
  Given 初期状態ベクトルは:
    """
    |Φ+>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ Z ├
        └───┘
    q1: ─────
    """
  Then Bell 基底での状態ベクトルは:
    """
    |Φ->
    """
```

加えて
- `|Φ-> -> |Φ+>`
- `0.6|Φ+> + 0.8|Φ-> -> 0.6|Φ-> + 0.8|Φ+>`
- `α|Φ+> + β|Φ-> -> α|Φ-> + β|Φ+>`

の 4 本へそろえる。

- [ ] **Step 2: `features/step_definitions/cli_steps.rb` に failing step を追加する**

```ruby
Then('Bell 基底での状態ベクトルは:') do |doc_string|
  @stdout, @stderr, @status = run_qni_command(@scenario_dir, 'qni run --symbolic --basis bell')
  assert_command_succeeded!(@status, @stdout, @stderr)
  assert_named_basis_state_matches!(@stdout, doc_string)
end
```

必要なら `canonical_named_basis_notation` を `Φ`, `Ψ` でも使えるように最小調整する。

- [ ] **Step 3: Red を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/katas/basic_gates/bell_state_change_1.feature
```

Expected:
- step 未定義、または comparison mismatch で FAIL

- [ ] **Step 4: 最小実装で Green にする**

実装内容:
- `Then Bell 基底での状態ベクトルは:` を追加する
- 必要なら `normalize_symbolic_aliases` へ `Φ`, `Ψ` の alias を足さずに済む形で `assert_named_basis_state_matches!` を使う
- `Given 初期状態ベクトルは:` が 2 qubit `InitialState` をそのまま扱えることを確認し、もし qubit 数を `1` 固定している箇所があれば最小修正する

- [ ] **Step 5: Green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber features/katas/basic_gates/bell_state_change_1.feature
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add features/step_definitions/cli_steps.rb features/katas/basic_gates/bell_state_change_1.feature
git commit -m "test: rewrite BellStateChange1 scenarios"
```

## Task 4: 近い Bell task と full check を回す

**Files:**
- No new files expected

- [ ] **Step 1: Bell 系 feature をまとめて回す**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_state.feature \
  features/qni_run.feature \
  features/katas/basic_gates/bell_state_change_1.feature \
  features/katas/basic_gates/bell_state_change_2.feature \
  features/katas/basic_gates/bell_state_change_3.feature
```

Expected: PASS

Task 1.9/1.10 がまだ旧 DSL でも、Bell shorthand と `--basis bell` を壊していないことだけはここで押さえる。

- [ ] **Step 2: fresh な symbolic setup を行う**

Run:

```bash
bash scripts/setup_symbolic_python.sh
```

Expected: `1.14.0`

- [ ] **Step 3: full check を実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

Expected:
- RuboCop green
- cucumber green
- reek green

- [ ] **Step 4: 仕上げ commit**

作業ブランチの最後が clean なら不要。追加の微修正があればここでまとめる。

## Notes for Implementers

- `lib/qni/initial_state.rb` はいま basis を `0` / `1` 固定で扱っているので、まずここが最大の境界変更になる
- `libexec/qni_symbolic_run.py` の X/Y basis は 1 qubit text-only という分岐で実装されている。Bell basis も同じ分岐に足すと見通しがよい
- `features/step_definitions/cli_steps.rb` の `Given 初期状態ベクトルは:` は direct `InitialState.parse` が成功したら qubit 数を `1` 固定で書くので、2 qubit 対応時はここを忘れず直す
- `bell_state_change_1.feature` の ASCII 回路は parser を使わず append path なので、2 qubit 1-column の簡単な回路図で十分

