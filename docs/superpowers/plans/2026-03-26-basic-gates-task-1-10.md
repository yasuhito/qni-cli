# BasicGates Task 1.10 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BasicGates Task 1.10 BellStateChange3` を `features/katas/basic_gates/bell_state_change_3.feature` に追加し、Quantum Katas の `DumpDiff` と controlled Bell state 検証を `qni-cli` 側で再現する。

**Architecture:** 先に `bell_state_change_3.feature` を追加し、2 qubit の数値シナリオ、2 qubit の symbolic シナリオ、3 qubit の controlled 検証シナリオを書いて red / green を確認する。`Task 1.8` と `Task 1.9` で整えた 2 qubit symbolic はそのまま再利用し、今回の焦点は `Task 1.10` 固有の位相罠を避けるために candidate を `qs[0]` に固定することと、`VerifyBellStateConversion(..., 0, 3)` の再現に multi-controlled `X` が本当に必要かを feature-first で切り分けることに置く。

**Tech Stack:** Ruby, Python, SymPy, Cucumber, Bundler, `qni-cli`

---

## File Structure

- Create: `features/katas/basic_gates/bell_state_change_3.feature`
  - `Task 1.10` の問題文、2 qubit の数値シナリオ、2 qubit の symbolic シナリオ、3 qubit の controlled 検証シナリオを追加する。
- Optionally modify: `features/qni_run.feature`
  - `Task 1.10` 用の Bell 状態 symbolic が未保証なら最小回帰を追加する。
- Optionally modify: `features/step_definitions/cli_steps.rb`
  - Bell 系 task に必要な test support が不足している場合だけ最小追加する。
- Optionally modify: `lib/qni/...`
  - `Task 1.10` の controlled 検証で multi-controlled `X` が不足した場合のみ、既存 gate 実行系に最小追加する。
- Verify: `features/katas/basic_gates/bell_state_change_1.feature`
  - `Task 1.8` が回帰していないことを確認する。
- Verify: `features/katas/basic_gates/bell_state_change_2.feature`
  - `Task 1.9` が回帰していないことを確認する。

## Task 1: `Task 1.10` feature を先に追加して不足を切り分ける

**Files:**
- Create: `features/katas/basic_gates/bell_state_change_3.feature`
- Test: `features/katas/basic_gates/bell_state_change_3.feature`

- [ ] **Step 1: `Task 1.10` の問題文とシナリオを書く**

`features/katas/basic_gates/bell_state_change_3.feature` を新規作成し、少なくとも次を追加する。

```gherkin
Feature: Quantum Katas BasicGates Task 1.10 BellStateChange3
  Task 1.10 BellStateChange3: |Φ⁺⟩ を |Ψ⁻⟩ に変える
  入力:
  2 量子ビットの Bell 状態 |Φ⁺⟩ = (|00⟩ + |11⟩) / sqrt(2)
  目標:
  状態を |Ψ⁻⟩ = (|01⟩ - |10⟩) / sqrt(2) に変える

  Scenario: Task 1.10 は |Φ⁺⟩ を |Ψ⁻⟩ に変換する
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add X --qubit 0 --step 2" を実行
    And "qni add Z --qubit 0 --step 3" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,0.7071067811865475,-0.7071067811865475,0.0
      """

  Scenario: Task 1.10 は symbolic 表示で |Ψ⁻⟩ を示す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add X --qubit 0 --step 2" を実行
    And "qni add Z --qubit 0 --step 3" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      0.707106781186547|01> - 0.707106781186547|10>
      """

  Scenario: Task 1.10 の controlled 検証回路は |000⟩ に戻る
    Given 空の 3 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add H --control 0 --qubit 1 --step 1" を実行
    And "qni add X --control 0,1 --qubit 2 --step 2" を実行
    And "qni add X --control 0 --qubit 1 --step 3" を実行
    And "qni add Z --control 0 --qubit 1 --step 4" を実行
    And "qni add X --control 0 --qubit 2 --step 5" を実行
    And "qni add Z --control 0 --qubit 2 --step 6" を実行
    And "qni add X --control 0,1 --qubit 2 --step 7" を実行
    And "qni add H --control 0 --qubit 1 --step 8" を実行
    And "qni add H --qubit 0 --step 9" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0
      """
```

この時点で feature に書く controlled 検証シナリオ自体は、`VerifyBellStateConversion(..., 0, 3)` の意図した回路を正確に表す。red が出る場合は、`CCNOT` 相当の不足や実行系の不足を示すものとして解釈する。

- [ ] **Step 2: focused 実行で red / green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/bell_state_change_3.feature
```

Expected:

- 数値 / symbolic のどこまで既存機能だけで通るかが分かる
- controlled 検証で multi-controlled `X` 相当が不足しているか、あるいは feature の並びだけで書けるかを切り分けられる

- [ ] **Step 3: feature-first の追加をコミットする**

```bash
git add features/katas/basic_gates/bell_state_change_3.feature
git commit -m "test: add Task 1.10 kata scenarios"
```

## Task 2: 必要なら最小修正で green にする

**Files:**
- Modify: `features/katas/basic_gates/bell_state_change_3.feature`
- Optionally modify: `features/qni_run.feature`
- Optionally modify: `features/step_definitions/cli_steps.rb`
- Optionally modify: `lib/qni/...`

- [ ] **Step 1: 失敗原因を 1 箇所に絞る**

想定する失敗原因は次に限る。

- controlled 検証回路の書き下ろしが間違っている
- `Task 1.10` に必要な multi-controlled `X`、すなわち `CCNOT` 相当の表現や実行が不足している
- `Task 1.10` 用の Bell 状態 symbolic が既存の `qni run --symbolic` で未保証である

- [ ] **Step 2: product code 不足がある場合だけ既存 feature に最小回帰を追加する**

不足が product code にある場合のみ、対応する既存 feature に最小シナリオを追加する。

- `CCNOT` 相当が不足しているなら、その表現と実行を保証する feature を先に追加する
- symbolic 出力の不足なら `features/qni_run.feature` に最小回帰を追加する

- [ ] **Step 3: 必要な最小実装だけを入れる**

実装変更は、実際に失敗した箇所のみに限定する。

- multi-controlled `X` が必要なら、それを支える最小実装だけを追加する
- `Task 1.10` 自体に不要な一般化はしない

- [ ] **Step 4: `Task 1.10` feature を再実行して green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/bell_state_change_3.feature
```

Expected:

- `Task 1.10` の feature が PASS

- [ ] **Step 5: 必要な修正をコミットする**

```bash
git add features/katas/basic_gates/bell_state_change_3.feature features/qni_run.feature features/step_definitions/cli_steps.rb lib/qni
git commit -m "feat: support Task 1.10 bell state verification"
```

実際に触った file のみ `git add` する。

## Task 3: 近接回帰を確認する

**Files:**
- Test: `features/qni_run.feature`
- Test: `features/katas/basic_gates/bell_state_change_1.feature`
- Test: `features/katas/basic_gates/bell_state_change_2.feature`
- Test: `features/katas/basic_gates/bell_state_change_3.feature`

- [ ] **Step 1: 近接 feature をまとめて実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/qni_run.feature \
  features/katas/basic_gates/bell_state_change_1.feature \
  features/katas/basic_gates/bell_state_change_2.feature \
  features/katas/basic_gates/bell_state_change_3.feature
```

Expected:

- すべて PASS

- [ ] **Step 2: 近接回帰の green をコミットする**

```bash
git commit --allow-empty -m "test: verify Task 1.10 regressions"
```

## Task 4: 全量確認して統合準備をする

**Files:**
- Test: repository-wide checks

- [ ] **Step 1: full cucumber を実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber
```

Expected:

- 全 scenario が PASS

- [ ] **Step 2: Ruby 品質チェックを実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake rubocop
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake reek
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flog
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flay
```

Expected:

- すべて PASS
