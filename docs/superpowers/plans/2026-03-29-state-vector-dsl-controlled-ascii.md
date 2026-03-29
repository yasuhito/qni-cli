# State Vector DSL Controlled ASCII Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `state_flip.feature` の controlled 検証 scenario を state-vector DSL にそろえ、`2 qubit + control` の ASCII 回路と `Ry(π/2)` のような角度つき ASCII 拡張を読めるようにする。

**Architecture:** まず feature-first で controlled scenario と parser acceptance を赤くし、`最初の状態ベクトルは:` の 2 qubit 対応を最小実装する。その後、`AsciiCircuitParser` を「複数 wire を step ごとに読む」形へ広げて 2 qubit controlled / swap を通し、最後に angled gate の ASCII 拡張を 1 qubit から追加する。`qni view` 自体は変更せず、角度つき表記は parser 拡張 DSL として扱う。

**Tech Stack:** Ruby, Cucumber, Minitest, Bundler, `qni-cli`

---

## File Structure

- Modify: `features/katas/basic_gates/state_flip.feature`
  - controlled 検証 scenario を `最初の状態ベクトルは:` / `次の回路を適用:` / `状態ベクトルは:` の形へそろえる。
- Modify: `features/ascii_circuit_parser.feature`
  - 2 qubit controlled ASCII と angled gate ASCII の受け入れ scenario を追加する。
- Modify: `features/step_definitions/cli_steps.rb`
  - `最初の状態ベクトルは:` の 2 qubit 対応と、必要なら 2 qubit symbolic の比較補助を追加する。
- Modify: `test/qni/view/ascii_circuit_parser_test.rb`
  - 2 qubit controlled gate、2 qubit swap、angled gate ASCII の parser unit test を追加する。
- Modify: `lib/qni/view/ascii_circuit_parser.rb`
  - 1 qubit 固定幅専用 parser から、2 qubit fixed gate / control / swap と angled gate 拡張を読める parser へ広げる。
- Optionally modify: `lib/qni/view/ascii_step_cell.rb`
  - fixed gate cell 判定と angled gate label 判定の責務を整理する。
- Optionally modify: `lib/qni/view/ascii_step_rows.rb`
  - 1 wire 専用の固定幅分割責務を、複数 wire / 可変幅 step 分割へ適応させる。
- Optionally create: `lib/qni/view/ascii_step_parser.rb`
  - 1 step 分の複数 qubit placement を判定する責務を切り出す場合に追加する。

## Task 1: controlled scenario を理想形で先に赤くする

**Files:**
- Modify: `features/katas/basic_gates/state_flip.feature`
- Modify: `features/ascii_circuit_parser.feature`
- Test: `features/katas/basic_gates/state_flip.feature`
- Test: `features/ascii_circuit_parser.feature`

- [ ] **Step 1: `state_flip.feature` の controlled scenario を理想形へ書き換える**

`features/katas/basic_gates/state_flip.feature` の最後の scenario を、次の形へ置き換える。

```gherkin
Scenario: controlled な X 検証回路は control qubit を |0> に戻す
  Given 最初の状態ベクトルは:
    """
    0.6|00> + 0.8|01>
    """
  When 次の回路を適用:
    """
        ┌───┐           ┌───┐
    q0: ┤ H ├──■────■──┤ H ├
        └───┘┌─┴─┐┌─┴─┐└───┘
    q1: ─────┤ X ├┤ X ├─────
             └───┘└───┘
    """
  Then 状態ベクトルは:
    """
    0.6|00> + 0.8|01>
    """
```

- [ ] **Step 2: ASCII parser acceptance を追加する**

`features/ascii_circuit_parser.feature` に、少なくとも次の 2 scenario を追加する。

```gherkin
Scenario: 2 qubit の controlled X 回路を ASCII アートから作る
  Given 次の回路がある:
    """
        ┌───┐
    q0: ──■──
        ┌─┴─┐
    q1: ┤ X ├
        └───┘
    """
  Given 2 qubit の初期状態が "|10>" である
  When "qni run" を実行
  Then 標準出力:
    """
    0.0,0.0,0.0,1.0
    """

Scenario: 1 qubit の Ry(π/2) 回路を拡張 ASCII から作る
  Given 次の回路がある:
    """
        ┌─────────┐
    q0: ┤ Ry(π/2) ├
        └─────────┘
    """
  Then 状態ベクトルは:
    """
    0.7071067811865476|0> + 0.7071067811865475|1>
    """
```

最初の scenario は `qni view` 互換寄り、2 本目は parser 拡張 DSL 用の acceptance とする。

- [ ] **Step 3: red を確認する**

Run:

```bash
bundle exec cucumber \
  features/katas/basic_gates/state_flip.feature \
  features/ascii_circuit_parser.feature
```

Expected:

- controlled scenario が undefined か failure で赤くなる
- ASCII parser acceptance が parser 非対応で赤くなる

- [ ] **Step 4: feature-first の red をコミットする**

```bash
git add features/katas/basic_gates/state_flip.feature features/ascii_circuit_parser.feature
git commit -m "test: add controlled ASCII DSL scenarios"
```

## Task 2: `最初の状態ベクトルは:` を 2 qubit へ広げる

**Files:**
- Modify: `features/step_definitions/cli_steps.rb`
- Optionally modify: `features/katas/basic_gates/state_flip.feature`
- Test: `features/katas/basic_gates/state_flip.feature`

- [ ] **Step 1: 2 qubit 初期状態の failing expectation を明確にする**

`features/katas/basic_gates/state_flip.feature` の controlled scenario だけを実行し、`0.6|00> + 0.8|01>` が未対応で落ちることを確認する。

Run:

```bash
bundle exec cucumber features/katas/basic_gates/state_flip.feature:78
```

Expected:

- `unsupported ... initial state` か、それに準ずる失敗が出る

- [ ] **Step 2: `cli_steps.rb` に 2 qubit の state-vector setup を足す**

`features/step_definitions/cli_steps.rb` に、少なくとも次の対応を追加する。

```ruby
TWO_QUBIT_INITIAL_STATE_COLS = {
  '|00>' => [[1, 1]],
  '|01>' => [[1, 'X']],
  '|10>' => [['X', 1]],
  '|11>' => [['X', 'X']],
  '0.6|00> + 0.8|01>' => [[1, 'Ry(1.8545904360032246)']]
}.freeze
```

`Given('最初の状態ベクトルは:')` は、`|...>` の桁数や登録済み literal を見て 1 qubit / 2 qubit を切り替える。

- [ ] **Step 3: controlled scenario の state setup だけ green にする**

Run:

```bash
bundle exec cucumber features/katas/basic_gates/state_flip.feature
```

Expected:

- 初期状態の failure は消える
- ただし `次の回路を適用:` 側がまだ赤でもよい

- [ ] **Step 4: state-vector setup 拡張をコミットする**

```bash
git add features/step_definitions/cli_steps.rb
git commit -m "feat: support 2-qubit state-vector DSL setup"
```

## Task 3: 2 qubit controlled / swap を読む parser 基盤を作る

**Files:**
- Modify: `lib/qni/view/ascii_circuit_parser.rb`
- Optionally modify: `lib/qni/view/ascii_step_cell.rb`
- Optionally modify: `lib/qni/view/ascii_step_rows.rb`
- Optionally create: `lib/qni/view/ascii_step_parser.rb`
- Modify: `test/qni/view/ascii_circuit_parser_test.rb`
- Test: `test/qni/view/ascii_circuit_parser_test.rb`
- Test: `features/ascii_circuit_parser.feature`

- [ ] **Step 1: unit test で 2 qubit controlled X を赤くする**

`test/qni/view/ascii_circuit_parser_test.rb` に、少なくとも次の fixture と期待値を追加する。

```ruby
CONTROLLED_X_GATE = <<~CIRCUIT
      ┌───┐
  q0: ──■──
      ┌─┴─┐
  q1: ┤ X ├
      └───┘
CIRCUIT

def test_parse_two_qubit_controlled_x_circuit
  circuit = AsciiCircuitParser.new(CONTROLLED_X_GATE).parse

  assert_equal(
    {
      'qubits' => 2,
      'cols' => [['•', 'X']]
    },
    circuit.to_h
  )
end
```

必要なら `SWAP` の最小ケースも同時に赤くする。

- [ ] **Step 2: parser を「複数 wire の step placement」中心へ最小リファクタする**

実装方針:

- 各 `qN:` 行を抽出する
- wire 全体を step ごとに分割する
- 各 step について、qubit ごとのセル集合から placement を判定する
- placement が
  - single gate なら `Circuit#add_gate`
  - controlled gate なら `Circuit#add_controlled_gate`
  - swap なら `Circuit#add_swap_gate`
  へ落とす

最初の green 対象は `2 qubit + controlled X + fixed-width` のみでよい。

- [ ] **Step 3: 2 qubit parser unit / acceptance を green にする**

Run:

```bash
bundle exec ruby -Itest test/qni/view/ascii_circuit_parser_test.rb
bundle exec cucumber features/ascii_circuit_parser.feature
```

Expected:

- controlled X の unit test が PASS
- 2 qubit controlled ASCII の feature が PASS

- [ ] **Step 4: parser 基盤変更をコミットする**

```bash
git add \
  lib/qni/view/ascii_circuit_parser.rb \
  lib/qni/view/ascii_step_cell.rb \
  lib/qni/view/ascii_step_rows.rb \
  test/qni/view/ascii_circuit_parser_test.rb \
  features/ascii_circuit_parser.feature
git commit -m "feat: parse 2-qubit controlled ASCII circuits"
```

実際に作成 / 変更した file だけ `git add` する。

## Task 4: controlled scenario を green にする

**Files:**
- Modify: `features/katas/basic_gates/state_flip.feature`
- Modify: `features/step_definitions/cli_steps.rb`
- Test: `features/katas/basic_gates/state_flip.feature`

- [ ] **Step 1: controlled scenario だけを再実行する**

Run:

```bash
bundle exec cucumber features/katas/basic_gates/state_flip.feature
```

Expected:

- controlled scenario だけが残っていれば、その failure が局所化される

- [ ] **Step 2: symbolic 比較や literal 表記の差分を最小修正で吸収する**

必要なら `features/step_definitions/cli_steps.rb` の `assert_symbolic_state_matches!` にだけ最小修正を入れる。ここでは 2 qubit ket 表記や係数 1 の省略で余計な一般化をしない。

- [ ] **Step 3: `state_flip.feature` を green にする**

Run:

```bash
bundle exec cucumber features/katas/basic_gates/state_flip.feature
```

Expected:

- `state_flip.feature` の全 scenario が PASS

- [ ] **Step 4: controlled scenario の green をコミットする**

```bash
git add features/katas/basic_gates/state_flip.feature features/step_definitions/cli_steps.rb
git commit -m "feat: rewrite controlled StateFlip scenario"
```

## Task 5: angled gate の ASCII 拡張を追加する

**Files:**
- Modify: `lib/qni/view/ascii_circuit_parser.rb`
- Optionally modify: `lib/qni/view/ascii_step_cell.rb`
- Modify: `test/qni/view/ascii_circuit_parser_test.rb`
- Modify: `features/ascii_circuit_parser.feature`
- Test: `test/qni/view/ascii_circuit_parser_test.rb`
- Test: `features/ascii_circuit_parser.feature`

- [ ] **Step 1: `Ry(π/2)` の unit / acceptance を赤くする**

`test/qni/view/ascii_circuit_parser_test.rb` に次を追加する。

```ruby
ANGLED_RY_GATE = <<~CIRCUIT
      ┌─────────┐
  q0: ┤ Ry(π/2) ├
      └─────────┘
CIRCUIT

def test_parse_angled_ry_gate_circuit
  circuit = AsciiCircuitParser.new(ANGLED_RY_GATE).parse

  assert_equal(
    {
      'qubits' => 1,
      'cols' => [['Ry(π/2)']]
    },
    circuit.to_h
  )
end
```

`features/ascii_circuit_parser.feature` の `Ry(π/2)` scenario もこの時点で red を確認する。

- [ ] **Step 2: angled gate label 判定を追加する**

実装方針:

- fixed gate label lookup と angled gate label lookup を分ける
- angled gate は `Name(angle)` の形をそのまま serialized gate として返す
- `Name` は `P`, `Rx`, `Ry`, `Rz` に限定する
- `angle` は既存 `AngleExpression` が読める文字列だけ通す

ここでは 1 qubit / single gate / single step から始め、2 qubit controlled target への angled gate は将来拡張に回してよい。

- [ ] **Step 3: angled gate parser の focused green を確認する**

Run:

```bash
bundle exec ruby -Itest test/qni/view/ascii_circuit_parser_test.rb
bundle exec cucumber features/ascii_circuit_parser.feature
```

Expected:

- `Ry(π/2)` の unit / acceptance が PASS
- 既存 1 qubit / 2 qubit controlled parser が回帰していない

- [ ] **Step 4: angled gate ASCII 拡張をコミットする**

```bash
git add \
  lib/qni/view/ascii_circuit_parser.rb \
  lib/qni/view/ascii_step_cell.rb \
  test/qni/view/ascii_circuit_parser_test.rb \
  features/ascii_circuit_parser.feature
git commit -m "feat: support angled gate ASCII syntax"
```

## Task 6: focused 回帰と全量確認をする

**Files:**
- Test: `features/katas/basic_gates/state_flip.feature`
- Test: `features/ascii_circuit_parser.feature`
- Test: `test/qni/view/ascii_circuit_parser_test.rb`
- Test: repository-wide checks

- [ ] **Step 1: focused parser / DSL 回帰を実行する**

Run:

```bash
bundle exec ruby -Itest test/qni/view/ascii_circuit_parser_test.rb
bundle exec cucumber \
  features/ascii_circuit_parser.feature \
  features/katas/basic_gates/state_flip.feature
bundle exec rubocop \
  lib/qni/view/ascii_circuit_parser.rb \
  lib/qni/view/ascii_step_cell.rb \
  lib/qni/view/ascii_step_rows.rb \
  features/step_definitions/cli_steps.rb \
  test/qni/view/ascii_circuit_parser_test.rb
```

Expected:

- focused tests と RuboCop が PASS

- [ ] **Step 2: repo 全体の確認を実行する**

Run:

```bash
bundle exec rake check
```

Expected:

- RuboCop, Cucumber, Reek, Flog, Flay を含む既存チェックが PASS

- [ ] **Step 3: 最終確認コミットを作る**

```bash
git commit --allow-empty -m "test: verify controlled ASCII DSL support"
```

この commit は verification 済みの区切りとして使う。不要ならスキップしてよいが、plan 実行時は verification の終了点を明確に残す。
