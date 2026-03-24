# BasicGates Task 1.9 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BasicGates Task 1.9 BellStateChange2` を `features/katas/basic_gates/bell_state_change_2.feature` に追加し、Quantum Katas の `DumpDiff` と controlled Bell state 検証を `qni-cli` 側で再現する。

**Architecture:** 先に `bell_state_change_2.feature` を追加し、2 qubit の数値シナリオ、2 qubit の symbolic シナリオ、3 qubit の controlled 検証シナリオを書いて red / green を確認する。`Task 1.8` で追加した 2 qubit symbolic と 3 qubit の空回路 step をそのまま再利用し、まずは新機能追加なしで完結するかを確かめる。不足が出た場合のみ、既存 feature へ最小回帰を追加して実装を足す。

**Tech Stack:** Ruby, Python, SymPy, Cucumber, Bundler, `qni-cli`

---

## File Structure

- Create: `features/katas/basic_gates/bell_state_change_2.feature`
  - `Task 1.9` の問題文、2 qubit の数値シナリオ、2 qubit の symbolic シナリオ、3 qubit の controlled 検証シナリオを追加する。
- Optionally modify: `features/qni_run.feature`
  - `Task 1.9` 用の Bell 状態 symbolic が未保証なら最小回帰を追加する。
- Optionally modify: `features/qni_expect.feature`
  - 3 qubit controlled Bell 検証に必要な期待値確認が未保証なら最小回帰を追加する。
- Optionally modify: `features/step_definitions/cli_steps.rb`
  - Bell 系 task に必要な test support が不足している場合だけ最小追加する。
- Verify: `features/katas/basic_gates/bell_state_change_1.feature`
  - `Task 1.8` が回帰していないことを確認する。
- Verify: `features/katas/basic_gates/global_phase_change.feature`
  - `Task 1.7` が回帰していないことを確認する。

## Task 1: `Task 1.9` feature を先に追加して不足を切り分ける

**Files:**
- Create: `features/katas/basic_gates/bell_state_change_2.feature`
- Test: `features/katas/basic_gates/bell_state_change_2.feature`

- [ ] **Step 1: `Task 1.9` の問題文とシナリオを書く**

`features/katas/basic_gates/bell_state_change_2.feature` を新規作成し、少なくとも次を追加する。

```gherkin
Feature: Quantum Katas BasicGates Task 1.9 BellStateChange2
  Task 1.9 BellStateChange2: |Φ⁺⟩ を |Ψ⁺⟩ に変える
  入力:
  2 量子ビットの Bell 状態 |Φ⁺⟩ = (|00⟩ + |11⟩) / sqrt(2)
  目標:
  状態を |Ψ⁺⟩ = (|01⟩ + |10⟩) / sqrt(2) に変える

  Scenario: Task 1.9 は |Φ⁺⟩ を |Ψ⁺⟩ に変換する
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add X --qubit 0 --step 2" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,0.7071067811865475,0.7071067811865475,0.0
      """

  Scenario: Task 1.9 は symbolic 表示で |Ψ⁺⟩ を示す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add X --qubit 0 --step 2" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      0.707106781186547|01> + 0.707106781186547|10>
      """

  Scenario: Task 1.9 の controlled 検証回路は |000⟩ に戻る
    Given 空の 3 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add H --control 0 --qubit 1 --step 1" を実行
    And "qni add X --control 1 --qubit 2 --step 2" を実行
    And "qni add X --control 0 --qubit 1 --step 3" を実行
    And "qni add X --control 0 --qubit 1 --step 4" を実行
    And "qni add X --control 1 --qubit 2 --step 5" を実行
    And "qni add H --control 0 --qubit 1 --step 6" を実行
    And "qni add H --qubit 0 --step 7" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0
      """
```

- [ ] **Step 2: focused 実行で red / green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/bell_state_change_2.feature
```

Expected:

- 少なくとも数値 / symbolic / controlled のどこで不足があるかを 1 箇所に切り分けられる
- `Task 1.8` の基盤だけで足りるならそのまま PASS

- [ ] **Step 3: feature-first の追加をコミットする**

```bash
git add features/katas/basic_gates/bell_state_change_2.feature
git commit -m "test: add Task 1.9 kata scenarios"
```

## Task 2: 必要なら最小修正で green にする

**Files:**
- Modify: `features/katas/basic_gates/bell_state_change_2.feature`
- Optionally modify: `features/qni_run.feature`
- Optionally modify: `features/qni_expect.feature`
- Optionally modify: `features/step_definitions/cli_steps.rb`
- Optionally modify: `lib/qni/...`

- [ ] **Step 1: 失敗原因を 1 箇所に絞る**

想定する失敗原因は次に限る。

- `Task 1.8` で追加した 2 qubit symbolic の対象 gate が足りない
- 3 qubit controlled 検証の並びが誤っている
- Bell 系 task に必要な test support が不足している

- [ ] **Step 2: product code 不足がある場合だけ既存 feature に最小回帰を追加する**

不足が product code にある場合のみ、対応する既存 feature に最小シナリオを追加する。

- [ ] **Step 3: 必要な最小実装だけを入れる**

実装変更は、実際に失敗した箇所のみに限定する。

- [ ] **Step 4: `Task 1.9` feature を再実行して green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/bell_state_change_2.feature
```

Expected:

- `Task 1.9` の feature が PASS

- [ ] **Step 5: 必要な修正をコミットする**

```bash
git add features/katas/basic_gates/bell_state_change_2.feature features/qni_run.feature features/qni_expect.feature features/step_definitions/cli_steps.rb lib/qni
git commit -m "feat: support Task 1.9 bell state verification"
```

実際に触った file のみ `git add` する。

## Task 3: 近接回帰を確認する

**Files:**
- Test: `features/qni_run.feature`
- Test: `features/qni_expect.feature`
- Test: `features/katas/basic_gates/global_phase_change.feature`
- Test: `features/katas/basic_gates/bell_state_change_1.feature`
- Test: `features/katas/basic_gates/bell_state_change_2.feature`

- [ ] **Step 1: 近接 feature をまとめて実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/qni_run.feature \
  features/qni_expect.feature \
  features/katas/basic_gates/global_phase_change.feature \
  features/katas/basic_gates/bell_state_change_1.feature \
  features/katas/basic_gates/bell_state_change_2.feature
```

Expected:

- すべて PASS

- [ ] **Step 2: 近接回帰の green をコミットする**

```bash
git commit --allow-empty -m "test: verify Task 1.9 regressions"
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
