# BasicGates Task 1.1 Symbolic Scenario Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BasicGates Task 1.1 StateFlip` に `qni run --symbolic` を使った説明用シナリオを 1 本追加し、一般式 `α|0> + β|1> -> α|1> + β|0>` を kata feature 上で直接読めるようにする。

**Architecture:** 既存の数値シナリオと controlled 検証シナリオは残し、`features/katas/basic_gates.feature` にだけ symbolic 回帰ケースを追加する。product code はすでに `qni run --symbolic` を持っているため、今回は feature 追加だけで閉じる前提で進め、回帰確認は `qni_run` と kata feature に限定する。

**Tech Stack:** Ruby, Cucumber, Bundler, `qni-cli`

---

## File Structure

- Modify: `features/katas/basic_gates.feature`
  - `Task 1.1` の説明用 symbolic シナリオを 1 本追加する。
- Verify: `features/qni_run.feature`
  - `qni run --symbolic` の既存振る舞いが回帰していないことを確認する。
- Verify: `features/katas/basic_gates.feature`
  - 既存の数値ケース、controlled 検証、追加した symbolic ケースが共存して green であることを確認する。

## Task 1: Add the failing symbolic kata scenario first

**Files:**
- Modify: `features/katas/basic_gates.feature`
- Test: `features/katas/basic_gates.feature`

- [ ] **Step 1: Write the new symbolic scenario**

`features/katas/basic_gates.feature` に次のシナリオを追加する。

```gherkin
  シナリオ: Task 1.1 は symbolic 表示で一般式の反転を示す
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    かつ "qni add X --qubit 0 --step 1" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      sin(theta/2)|0> + cos(theta/2)|1>
      """
```

- [ ] **Step 2: Run the focused kata feature and verify it fails for the right reason**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

Expected:

- 新規 symbolic シナリオだけが失敗する
- 失敗理由は期待文字列不一致か、`qni run --symbolic` の実際の出力との差にある
- 既存の数値シナリオと controlled シナリオは引き続き green

- [ ] **Step 3: Commit the failing feature**

```bash
git add features/katas/basic_gates.feature
git commit -m "test: add symbolic Task 1.1 scenario"
```

## Task 2: Adjust the kata feature minimally until it matches real symbolic output

**Files:**
- Modify: `features/katas/basic_gates.feature`
- Test: `features/katas/basic_gates.feature`

- [ ] **Step 1: Re-run only the failing scenario to inspect the actual output**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature:52
```

Expected:

- actual の symbolic 出力が 1 行で見える
- 期待値との差分が文字列レベルで確認できる

- [ ] **Step 2: Make the smallest possible correction**

変更は次のどちらかに限定する。

- helper の既存出力が正しいなら、feature の期待文字列だけを修正する
- helper の出力が `qni_run.feature` の既存方針と矛盾するなら、この計画を止めて新しい spec / plan に戻る

このタスクでは product code を新たに変更しない。

- [ ] **Step 3: Re-run the kata feature and verify it turns green**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

Expected:

- 追加した symbolic シナリオを含めて `features/katas/basic_gates.feature` が green

- [ ] **Step 4: Commit the corrected scenario**

```bash
git add features/katas/basic_gates.feature
git commit -m "test: document Task 1.1 with symbolic run"
```

## Task 3: Verify nearby regressions

**Files:**
- Verify: `features/katas/basic_gates.feature`
- Verify: `features/qni_run.feature`

- [ ] **Step 1: Run the targeted regression set**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature features/katas/basic_gates.feature
```

Expected:

- PASS
- `qni run --symbolic` の既存 feature が回帰していない
- `Task 1.1` の数値・controlled・symbolic の 3 系統が共存して green

- [ ] **Step 2: Inspect final diff**

Check:

- 変更が `features/katas/basic_gates.feature` だけに収まっている
- product code に変更がない

- [ ] **Step 3: Commit the verification checkpoint**

```bash
git add features/katas/basic_gates.feature
git commit -m "test: verify symbolic Task 1.1 coverage"
```

## Notes

- 今回の目的は correctness 強化ではなく、`Task 1.1` の一般式を `qni-cli` だけで読めるようにすること。
- 数値シナリオと controlled 検証シナリオは削除しない。
- 実際の symbolic 出力が spec と異なる場合は、まず `qni_run.feature` の既存仕様と整合しているかを確認し、整合しているなら kata feature 側の期待値を合わせる。
