# BasicGates Task 1.1 General-State Verification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BasicGates Task 1.1 StateFlip` の検証を基底状態 2 例から一般状態 1 例まで広げ、`0.6|0⟩ + 0.8|1⟩` が `X` によって `0.8|0⟩ + 0.6|1⟩` へ反転することを `qni run` で確認できるようにする。

**Architecture:** 既存の [basic_gates.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates.feature) に非自明な振幅ケースを 1 本追加する。`qni-cli` 本体には手を入れず、`features/step_definitions/cli_steps.rb` の既存 1 qubit 初期状態 step を最小限だけ拡張して、Kata が使う具体的な振幅パターンを準備できるようにする。

**Tech Stack:** Ruby, Cucumber, Bundler, `qni-cli`

---

## File Structure

- Modify: `features/katas/basic_gates.feature`
  - `Task 1.1` の一般状態シナリオを追加する。
- Modify: `features/step_definitions/cli_steps.rb`
  - `0.6|0> + 0.8|1>` を準備できるよう既存 step の `case` を拡張する。
- Verify: `features/qni_run.feature`
  - `qni run` の既存振る舞いが回帰していないことを確認する。
- Verify: `features/add/add_x_gate.feature.md`
  - `X` ゲート追加が回帰していないことを確認する。

### Task 1: Add the failing general-state scenario

**Files:**
- Modify: `features/katas/basic_gates.feature`
- Test: `features/katas/basic_gates.feature`

- [ ] **Step 1: Write the failing scenario**

`features/katas/basic_gates.feature` に次のシナリオを追加する。

```gherkin
  シナリオ: Task 1.1 は 0.6|0> + 0.8|1> を 0.8|0> + 0.6|1> に反転する
    前提 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    かつ "qni add X --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.8,0.6
      """
```

- [ ] **Step 2: Run the feature and verify it fails for the right reason**

Run:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

Expected:

- 新規シナリオだけが失敗する
- 失敗理由は未定義 step ではなく `unsupported 1-qubit initial state: 0.6|0> + 0.8|1>` である

- [ ] **Step 3: Commit the failing test**

```bash
git add features/katas/basic_gates.feature
git commit -m "test: add general-state Task 1.1 scenario"
```

### Task 2: Extend the 1-qubit state-preparation step minimally

**Files:**
- Modify: `features/step_definitions/cli_steps.rb`
- Test: `features/katas/basic_gates.feature`

- [ ] **Step 1: Re-run the focused failing scenario**

Run:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature:29
```

Expected:

- `unsupported 1-qubit initial state: 0.6|0> + 0.8|1>` が再現する

- [ ] **Step 2: Add the minimal case branch**

`features/step_definitions/cli_steps.rb` の既存 `前提('1 qubit の初期状態が {string} である')` に次の `when` を追加する。

```ruby
        when '0.6|0> + 0.8|1>'
          ['Ry(1.8545904360032246)']
```

この角度 `1.8545904360032246` は `2 * Math.acos(0.6)` に対応し、`qni run` では `0.6,0.8` を生成する。

- [ ] **Step 3: Run the kata feature and verify it passes**

Run:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

Expected:

- 3 scenarios
- 0 failures

- [ ] **Step 4: Commit the support change**

```bash
git add features/step_definitions/cli_steps.rb features/katas/basic_gates.feature
git commit -m "test: support general-state Task 1.1 setup"
```

### Task 3: Verify relevant regressions

**Files:**
- Verify: `features/katas/basic_gates.feature`
- Verify: `features/qni_run.feature`
- Verify: `features/add/add_x_gate.feature.md`

- [ ] **Step 1: Run the targeted regression set**

Run:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/add/add_x_gate.feature.md features/qni_run.feature features/katas/basic_gates.feature
```

Expected:

- PASS
- `features/katas/basic_gates.feature` の 3 シナリオがすべて green

- [ ] **Step 2: Inspect whether product code stayed untouched**

Check:

- 変更が `features/katas/basic_gates.feature` と `features/step_definitions/cli_steps.rb` に限られている
- `lib/` 配下に変更がない

- [ ] **Step 3: Commit the verification point**

```bash
git add features/katas/basic_gates.feature features/step_definitions/cli_steps.rb
git commit -m "test: verify Task 1.1 on a general state"
```

## Notes

- 今回は correctness 強化だけを行う。controlled 等価性の補助検証は別の次段に切る。
- `qni run` のシンボリック表示オプションはさらに後段で扱う。今回の変更に混ぜない。
- 状態準備 step は汎用パーサにしない。Kata が要求する `0.6|0> + 0.8|1>` だけを最小追加する。
