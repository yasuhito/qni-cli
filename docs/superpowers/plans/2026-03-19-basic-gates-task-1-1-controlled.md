# BasicGates Task 1.1 Controlled Verification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BasicGates Task 1.1 StateFlip` の controlled 検証回路を `qni-cli` だけで記述し、Kata の確認フェーズに相当する検証を `features/katas/basic_gates.feature` で回帰テストとして固定する。

**Architecture:** 新しい検証専用コマンドは追加せず、既存の `qni add H`、`qni add Ry`、`qni add X --control`、`qni expect` を使って検証回路そのものを組む。まず feature を追加して現行 CLI でそのまま通るかを確認し、不足が出た場合に限って `features/step_definitions/cli_steps.rb` の test support を最小限だけ広げる。

**Tech Stack:** Ruby, Cucumber, Bundler, `qni-cli`

---

## File Structure

- Modify: `features/katas/basic_gates.feature`
  - `Task 1.1` の controlled 検証シナリオを追加する。
- Modify if needed: `features/step_definitions/cli_steps.rb`
  - 既存 step だけで書けない場合に限り、2 qubit 準備の補助 step を最小追加する。
- Verify: `features/qni_expect.feature`
  - controlled gate と `qni expect` の既存振る舞いが回帰していないことを確認する。
- Verify: `features/add/add_x_gate.feature.md`
  - controlled-`X` の基本的な追加フローが回帰していないことを確認する。
- Reference only: `../oss/QuantumKatas/BasicGates/Tests.qs`
  - `T101_StateFlip` の意図と `DumpDiffOnOneQubit` / `AssertOperationsEqualReferenced` の確認元として読む。

## Verification Circuit

`Task 1.1` の controlled 検証は次の 2 qubit 回路として表現する。

1. qubit 0 を control とし、`H` で `|+⟩` を作る
2. qubit 1 を target とし、`Ry(1.8545904360032246)` で `0.6|0⟩ + 0.8|1⟩` を作る
3. candidate の controlled-`X` を適用する
4. reference の adjoint に相当する controlled-`X` を適用する
5. qubit 0 に再び `H` をかける
6. `qni expect ZI` を実行し、control 側が `|0⟩` に戻ったことを `ZI=1.0` で確認する

現行 CLI で確認した期待出力は次のとおり。

```text
ZI=1.0
```

## Task 1: Add the controlled-verification feature first

**Files:**
- Modify: `features/katas/basic_gates.feature`
- Test: `features/katas/basic_gates.feature`

- [ ] **Step 1: Write the new controlled-verification scenario**

`features/katas/basic_gates.feature` に次のシナリオを追加する。

```gherkin
  シナリオ: Task 1.1 の controlled 検証回路は control qubit を |0> に戻す
    前提 空の 2 qubit 回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    かつ "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    かつ "qni add X --control 0 --qubit 1 --step 2" を実行
    かつ "qni add X --control 0 --qubit 1 --step 3" を実行
    かつ "qni add H --qubit 0 --step 4" を実行
    もし "qni expect ZI" を実行
    ならば 標準出力:
      """
      ZI=1.0
      """
```

- [ ] **Step 2: Run the focused kata feature**

Run:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

Expected:

- 新規 controlled シナリオを含めて実行される
- 既存 CLI / step だけで通るならそのまま green
- 失敗する場合は、不足が product code ではなく test support か feature 記述にあることを特定する

- [ ] **Step 3: Commit the feature addition**

もし Step 2 が green なら、その場でコミットする。

```bash
git add features/katas/basic_gates.feature
git commit -m "test: add controlled Task 1.1 verification"
```

## Task 2: Add only the minimum missing support if the feature does not run

**Files:**
- Modify if needed: `features/step_definitions/cli_steps.rb`
- Test: `features/katas/basic_gates.feature`

- [ ] **Step 1: Reproduce the focused failure**

Run:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature:31
```

Expected:

- 失敗位置が controlled シナリオだけに絞られる
- 不足が step 定義、初期状態準備、または出力比較のどれかに切り分けられる

- [ ] **Step 2: Implement the minimum necessary support**

追加できる変更は次の範囲に限定する。

- `空の 2 qubit 回路がある` が不足ならその step を補う
- 既存の `"qni add ..."` 実行 step で足りない場合にのみ test support を直す
- product code の変更は、CLI で検証回路が本当に表現できないと確定した場合に限る

このタスクでは新しい検証専用コマンドは追加しない。

- [ ] **Step 3: Re-run the kata feature**

Run:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

Expected:

- controlled シナリオを含む `features/katas/basic_gates.feature` が green

- [ ] **Step 4: Commit the minimal support change**

```bash
git add features/katas/basic_gates.feature features/step_definitions/cli_steps.rb
git commit -m "test: support controlled Task 1.1 verification"
```

## Task 3: Verify the controlled path and nearby regressions

**Files:**
- Verify: `features/katas/basic_gates.feature`
- Verify: `features/qni_expect.feature`
- Verify: `features/add/add_x_gate.feature.md`

- [ ] **Step 1: Run the targeted regression set**

Run:

```bash
/home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/add/add_x_gate.feature.md features/qni_expect.feature features/katas/basic_gates.feature
```

Expected:

- PASS
- `features/katas/basic_gates.feature` の controlled シナリオが green
- `features/qni_expect.feature` の controlled-`X` と期待値表示が回帰していない

- [ ] **Step 2: Inspect the final diff**

Check:

- 変更が feature と step 定義の最小範囲に留まっている
- 新しい CLI コマンドが増えていない
- `Task 1.1` の検証回路を `qni-cli` の既存表現で記述できている

- [ ] **Step 3: Commit the verification checkpoint**

```bash
git add features/katas/basic_gates.feature features/step_definitions/cli_steps.rb
git commit -m "test: verify controlled Task 1.1 circuit"
```

## Notes

- 今回のスコープは correctness 強化の第 2 段だけであり、`qni run` のシンボリック表示は含めない。
- controlled 検証では、Kata の確認フェーズの意図を「検証回路を `qni-cli` で書けること」として保存する。
- `Task 1.1` は candidate と reference がどちらも `X` なので、feature 上では同じ controlled-`X` が 2 回並ぶ。それでも「検証回路を CLI で記述できる」こと自体がこの段階の目的である。
- 実装途中で product code の不足が見つかった場合は、新しい plan を切る前提で一度止め、必要な `features/*.feature` を先に追加する。
