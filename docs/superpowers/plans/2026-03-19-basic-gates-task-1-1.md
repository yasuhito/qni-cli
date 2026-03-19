# BasicGates Task 1.1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `QuantumKatas` の `BasicGates Task 1.1 StateFlip` を `qni-cli` 側の回帰テストとして追加し、`|0⟩ -> |1⟩` と `|1⟩ -> |0⟩` を `qni run` で検証できるようにする。

**Architecture:** 既存の Cucumber ベースの CLI 受け入れテストに、Kata 専用 feature を 1 つ追加する。`qni-cli` 本体は先に変更せず、まずは既存の `X` ゲートと `qni run` だけで Task 1.1 を表現できるかを確認し、足りないものがあれば test support 側に最小限の step を追加する。

**Tech Stack:** Ruby, Cucumber, Bundler, `qni-cli`

---

## File Structure

- Create: `features/katas_basic_gates.feature`
  - `BasicGates Task 1.1` の回帰シナリオを持つ。
- Modify: `features/step_definitions/cli_steps.rb`
  - 1 qubit の `|1⟩` 初期状態を準備する step を追加する。
- Verify: `features/add_x_gate.feature`
  - 既存の `X` ゲート追加機能が回帰していないことを確認する。
- Verify: `features/qni_run.feature`
  - 既存の `qni run` 振る舞いが回帰していないことを確認する。

### Task 1: Add the kata regression feature

**Files:**
- Create: `features/katas_basic_gates.feature`
- Test: `features/katas_basic_gates.feature`

- [ ] **Step 1: Write the failing feature scenarios**

`features/katas_basic_gates.feature` に日本語 feature を追加し、少なくとも次の 2 シナリオを書く。

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

- [ ] **Step 2: Run the new feature and verify it fails**

Run:

```bash
bundle exec cucumber features/katas_basic_gates.feature
```

Expected:

- 1 本目のシナリオは通る可能性がある
- 2 本目は `前提 1 qubit の初期状態が "|1>" である` が未定義で失敗する

- [ ] **Step 3: Commit the failing test**

```bash
git add features/katas_basic_gates.feature
git commit -m "test: add BasicGates Task 1.1 regression scenarios"
```

### Task 2: Add the missing 1-qubit state preparation step

**Files:**
- Modify: `features/step_definitions/cli_steps.rb`
- Test: `features/katas_basic_gates.feature`

- [ ] **Step 1: Run the focused failure again**

Run:

```bash
bundle exec cucumber features/katas_basic_gates.feature:12
```

Expected:

- 未定義 step エラーが再現する

- [ ] **Step 2: Write the minimal step definition**

`features/step_definitions/cli_steps.rb` に、1 qubit の初期状態を作る step を追加する。

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

- [ ] **Step 3: Run the kata feature and verify it passes**

Run:

```bash
bundle exec cucumber features/katas_basic_gates.feature
```

Expected:

- 2 scenarios
- 0 failures

- [ ] **Step 4: Commit the support change**

```bash
git add features/step_definitions/cli_steps.rb features/katas_basic_gates.feature
git commit -m "test: support BasicGates Task 1.1 state preparation"
```

### Task 3: Verify no product change is required

**Files:**
- Verify: `features/add_x_gate.feature`
- Verify: `features/qni_run.feature`
- Verify: `features/katas_basic_gates.feature`

- [ ] **Step 1: Run the existing X-gate feature**

Run:

```bash
bundle exec cucumber features/add_x_gate.feature
```

Expected:

- PASS

- [ ] **Step 2: Run the existing qni run feature**

Run:

```bash
bundle exec cucumber features/qni_run.feature
```

Expected:

- PASS

- [ ] **Step 3: Re-run the kata feature**

Run:

```bash
bundle exec cucumber features/katas_basic_gates.feature
```

Expected:

- PASS

- [ ] **Step 4: Inspect whether `qni-cli` implementation changes are still unnecessary**

Check:

- `features/katas_basic_gates.feature` が green である
- `features/add_x_gate.feature` が green である
- `features/qni_run.feature` が green である
- `lib/` 配下に変更が不要である

If all are true:

- 今回は `qni-cli` 本体の変更は不要
- `Task 1.1` は既存機能で表現・検証可能と結論づける

- [ ] **Step 5: Commit the verification result**

```bash
git add features/katas_basic_gates.feature features/step_definitions/cli_steps.rb
git commit -m "test: verify BasicGates Task 1.1 with existing qni-cli"
```

## Notes

- `Task 1.1` は最初の回帰ケースなので、補助検証は追加しない。まずは `qni run` の状態ベクトル比較だけで成立させる。
- もし `features/qni_run.feature` の既存 step だけで `|1>` 初期状態を十分に表現できる別手段が見つかれば、新 step 追加は不要。その場合でも plan は「最小変更で green にする」という原則で実行する。
- `QuantumKatas` 本体は編集しない。参照のみ。
