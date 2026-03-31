# Angled Gate Stacked Angle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 回転ゲートを「角度を箱の上に中央揃えで表示する」4 行の canonical ASCII form に統一し、`qni view` と ASCII parser の両方でその表記を正式サポートする。

**Architecture:** `TextRenderer` に step ごとの高さを導入し、回転ゲートを含む step だけ 4 行で描画する。ASCII parser 側も同じ 4 行構造を前提に step を切り出し、angle 行と gate 箱を結びつけて内部の `Ry(2*theta)` などへ正規化する。旧式の横長箱表記は削除し、新しい表記だけを正規入力とする。

**Tech Stack:** Ruby, Cucumber, Minitest, box-drawing ASCII renderer/parser

---

## File Structure

**Modify:**
- `/home/yasuhito/Work/qni-cli/features/qni_view.feature`
- `/home/yasuhito/Work/qni-cli/features/ascii_circuit_parser.feature`
- `/home/yasuhito/Work/qni-cli/features/katas/basic_gates/amplitude_change.feature`
- `/home/yasuhito/Work/qni-cli/lib/qni/view/text_renderer.rb`
- `/home/yasuhito/Work/qni-cli/lib/qni/view/cell.rb`
- `/home/yasuhito/Work/qni-cli/lib/qni/view/ascii_wire_layout.rb`
- `/home/yasuhito/Work/qni-cli/lib/qni/view/ascii_step_parser.rb`
- `/home/yasuhito/Work/qni-cli/lib/qni/view/ascii_circuit_parser.rb`
- `/home/yasuhito/Work/qni-cli/lib/qni/angle_expression.rb`
- `/home/yasuhito/Work/qni-cli/test/qni/view/ascii_circuit_parser_test.rb`

**Create if needed:**
- `/home/yasuhito/Work/qni-cli/test/qni/view/text_renderer_test.rb`

**Existing WIP note:**
- 実装開始前に clean な worktree を切ること
- `/home/yasuhito/Work/qni-cli` の未コミット差分には依存しないこと

### Task 1: Lock The New ASCII Form In Features

**Files:**
- Modify: `/home/yasuhito/Work/qni-cli/features/qni_view.feature`
- Modify: `/home/yasuhito/Work/qni-cli/features/ascii_circuit_parser.feature`
- Modify: `/home/yasuhito/Work/qni-cli/features/katas/basic_gates/amplitude_change.feature`

- [ ] **Step 1: Rewrite the view expectations for angled gates**

回転ゲートの表示期待をすべて新しい canonical form に書き換える。

```gherkin
Scenario: qni view は Ry ゲートを表示
  Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
  When "qni view" を実行
  Then 回路図:
    """
         π/2
      ┌───┐
    q0: ┤ Ry├
      └───┘
    """
```

- [ ] **Step 2: Rewrite the amplitude kata to the new form**

`/home/yasuhito/Work/qni-cli/features/katas/basic_gates/amplitude_change.feature` の `Ry(2θ)` / `Ry(2π/3)` を、箱の上に角度を置く 4 行形式へ書き換える。

- [ ] **Step 3: Rewrite the ASCII parser feature and add a reject case**

新しい 4 行形式の受け入れ scenario を書き、旧横長箱を reject する scenario を追加する。

```gherkin
Scenario: 旧式の横長な Ry 箱は受け付けない
  Given 次の回路がある:
    """
        ┌────────┐
    q0: ┤ Ry(2θ) ├
        └────────┘
    """
  Then エラー:
    """
    ...
    """
```

- [ ] **Step 4: Run feature slices and confirm they fail for the right reason**

Run:
```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_view.feature \
  features/ascii_circuit_parser.feature \
  features/katas/basic_gates/amplitude_change.feature
```

Expected:
- `qni view` の angled gate 表示 mismatch で fail
- ASCII parser が新しい 4 行形式をまだ読めず fail

- [ ] **Step 5: Commit the red features**

```bash
git add features/qni_view.feature features/ascii_circuit_parser.feature features/katas/basic_gates/amplitude_change.feature
git commit -m "test: lock stacked angle gate ascii form"
```

### Task 2: Lock Parser Unit Tests For The New Step Shape

**Files:**
- Modify: `/home/yasuhito/Work/qni-cli/test/qni/view/ascii_circuit_parser_test.rb`

- [ ] **Step 1: Add a unit fixture for the new 4-line angled gate**

```ruby
STACKED_RY_GATE = <<~CIRCUIT
      2θ
    ┌───┐
q0: ┤ Ry├
    └───┘
CIRCUIT
```

- [ ] **Step 2: Add a parse expectation for canonical normalization**

```ruby
assert_equal(
  {
    'qubits' => 1,
    'cols' => [['Ry(2*theta)']]
  },
  AsciiCircuitParser.new(STACKED_RY_GATE).parse.to_h
)
```

- [ ] **Step 3: Add a rejection test for the old long-box form**

旧式 `┤ Ry(2θ) ├` が `AsciiCircuitParser::Error` になることを固定する。

- [ ] **Step 4: Run the unit test and verify it fails correctly**

Run:
```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest \
  test/qni/view/ascii_circuit_parser_test.rb
```

Expected:
- 新しい 4 行形式が未対応で fail
- 旧式 reject がまだ通らず fail

- [ ] **Step 5: Commit the red unit tests**

```bash
git add test/qni/view/ascii_circuit_parser_test.rb
git commit -m "test: cover stacked angled gate parsing"
```

### Task 3: Implement Stacked-Angle Rendering

**Files:**
- Modify: `/home/yasuhito/Work/qni-cli/lib/qni/view/text_renderer.rb`
- Modify: `/home/yasuhito/Work/qni-cli/lib/qni/view/cell.rb`
- Test: `/home/yasuhito/Work/qni-cli/features/qni_view.feature`
- Test: `/home/yasuhito/Work/qni-cli/features/katas/basic_gates/amplitude_change.feature`
- Create if needed: `/home/yasuhito/Work/qni-cli/test/qni/view/text_renderer_test.rb`

- [ ] **Step 1: Add a dedicated angled-gate draw element**

`cell.rb` に `AngledBoxOnQuWire` を追加し、次の 4 行を返せるようにする。

```ruby
angle
top
mid
bot
```

angle 行は角度文字列を gate 箱に対して中央揃えで返す。

- [ ] **Step 2: Make step layers height-aware**

`TextRenderer` に「その step が 3 行か 4 行か」を判断する処理を入れ、回転ゲートを含む step では他の qubit 側にも空の angle 行を足す。

- [ ] **Step 3: Render angled gates with symbol-only boxes**

`Ry(π/2)` は `Ry` だけ箱に入れ、角度 `π/2` は上行へ分離する。

- [ ] **Step 4: Run the smallest view checks**

Run:
```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/qni_view.feature:113 \
  features/qni_view.feature:123 \
  features/qni_view.feature:133 \
  features/katas/basic_gates/amplitude_change.feature
```

Expected:
- angled gate の `qni view` 表示が pass
- amplitude change の 4 行 ASCII が pass

- [ ] **Step 5: Commit the rendering change**

```bash
git add lib/qni/view/text_renderer.rb lib/qni/view/cell.rb features/qni_view.feature features/katas/basic_gates/amplitude_change.feature
git commit -m "feat: render angled gates with stacked angles"
```

### Task 4: Implement 4-Line ASCII Parsing

**Files:**
- Modify: `/home/yasuhito/Work/qni-cli/lib/qni/view/ascii_wire_layout.rb`
- Modify: `/home/yasuhito/Work/qni-cli/lib/qni/view/ascii_step_parser.rb`
- Modify: `/home/yasuhito/Work/qni-cli/lib/qni/view/ascii_circuit_parser.rb`
- Modify: `/home/yasuhito/Work/qni-cli/lib/qni/angle_expression.rb`
- Test: `/home/yasuhito/Work/qni-cli/features/ascii_circuit_parser.feature`
- Test: `/home/yasuhito/Work/qni-cli/test/qni/view/ascii_circuit_parser_test.rb`

- [ ] **Step 1: Teach the wire layout to slice 4-line angled steps**

`AsciiWireLayout` が `angle/top/mid/bottom` を 1 step として切り出せるようにする。固定ゲート step は従来どおり 3 行で扱う。

- [ ] **Step 2: Pass angle-line information into the step parser**

`AsciiStepParser` の入力を広げ、angled gate では
- angle 行
- box label
を組み合わせて gate symbol を作る。

- [ ] **Step 3: Remove support for the old long-box label form**

`┤ Ry(2θ) ├` のように label 内へ角度が埋まっている形を受理しないようにする。

- [ ] **Step 4: Keep canonical internal normalization**

`AngleExpression` は引き続き
- `θ -> theta`
- `2θ -> 2*theta`
を正規化し、parser 保存値は `Ry(2*theta)` に統一する。

- [ ] **Step 5: Run parser unit + feature checks**

Run:
```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec ruby -Itest \
  test/qni/view/ascii_circuit_parser_test.rb

BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/ascii_circuit_parser.feature \
  features/katas/basic_gates/amplitude_change.feature
```

Expected:
- 新形式 accept が pass
- 旧形式 reject が pass
- `Ry(2θ)` が `Ry(2*theta)` に正規化される

- [ ] **Step 6: Commit the parser change**

```bash
git add lib/qni/view/ascii_wire_layout.rb lib/qni/view/ascii_step_parser.rb lib/qni/view/ascii_circuit_parser.rb lib/qni/angle_expression.rb features/ascii_circuit_parser.feature test/qni/view/ascii_circuit_parser_test.rb
git commit -m "feat: parse stacked angled gate ascii"
```

### Task 5: Full Regression And Cleanup

**Files:**
- Modify: `/home/yasuhito/Work/qni-cli/features/step_definitions/cli_steps.rb` (only if the old amplitude helper still exists)
- Modify: `/home/yasuhito/Work/qni-cli/test/qni/angle_expression_test.rb` (if additional shorthand coverage is needed)

- [ ] **Step 1: Remove obsolete amplitude-rotation step DSL if still present**

`When 振幅を ... だけ回転:` が残っていれば削除し、`amplitude_change.feature` は `When 次の回路を適用:` だけに統一する。

- [ ] **Step 2: Add any missing shorthand normalization test**

必要なら `test/qni/angle_expression_test.rb` を追加または更新して、`2θ -> 2*theta` の canonical 化を固定する。

- [ ] **Step 3: Run the full project check from a fresh setup**

Run:
```bash
bash scripts/setup_symbolic_python.sh
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

Expected:
- exit code 0
- all cucumber scenarios pass
- RuboCop / Reek / Flog / Flay all pass

- [ ] **Step 4: Commit the cleanup and final green state**

```bash
git add features/step_definitions/cli_steps.rb test/qni/angle_expression_test.rb
git commit -m "test: finalize stacked angle gate ascii form"
```

## Notes For The Implementer

- 旧式の横長箱との両対応はやらない
- `qni view` の canonical 出力をそのまま parser が読めることを優先する
- fixed gate / controlled gate / swap gate の既存の見た目は変えない
- renderer と parser の両方を一度に green にしようとせず、必ず赤テストを確認してから最小実装で進める
