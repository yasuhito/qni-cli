# BasicGates Task 1.8 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BasicGates Task 1.8 BellStateChange1` を `features/katas/basic_gates/bell_state_change_1.feature` に追加し、Quantum Katas の `DumpDiff` と controlled Bell state 検証を `qni-cli` 側で再現する。同時に `qni run --symbolic` を 2 qubit 回路まで拡張する。

**Architecture:** 先に `bell_state_change_1.feature` を追加し、2 qubit の数値シナリオ、2 qubit の symbolic シナリオ、3 qubit の controlled 検証シナリオを書いて red / green を確認する。`Task 1.8` の説明力に必要な 2 qubit symbolic は Python/SymPy helper に実装し、Ruby 側は既存の subprocess 境界とエラー整形を再利用する。まずは Bell 系に必要な gate だけを対象にし、不足が出た場合だけ既存 feature へ最小回帰を追加して実装を足す。

**Tech Stack:** Ruby, Python, SymPy, Cucumber, Bundler, `qni-cli`

---

## File Structure

- Create: `features/katas/basic_gates/bell_state_change_1.feature`
  - `Task 1.8` の問題文、2 qubit の数値シナリオ、2 qubit の symbolic シナリオ、3 qubit の controlled 検証シナリオを追加する。
- Modify: `features/qni_run.feature`
  - `qni run --symbolic` の 2 qubit 表示に関する最小回帰を追加する。
- Optionally modify: `features/qni_expect.feature`
  - 3 qubit controlled Bell 検証に必要な期待値確認が未保証なら最小回帰を追加する。
- Modify: `lib/qni/symbolic_state_renderer.rb`
  - 2 qubit symbolic を許可する Ruby 側の分岐と helper 呼び出しを調整する。
- Modify: `libexec/qni_symbolic_run.py`
  - 2 qubit symbolic 計算と controlled gate の適用を実装する。
- Verify: `features/katas/basic_gates/global_phase_change.feature`
  - `Task 1.7` が回帰していないことを確認する。

## Task 1: `Task 1.8` feature を先に追加して不足を切り分ける

**Files:**
- Create: `features/katas/basic_gates/bell_state_change_1.feature`
- Test: `features/katas/basic_gates/bell_state_change_1.feature`

- [ ] **Step 1: `Task 1.8` の問題文とシナリオを書く**

`features/katas/basic_gates/bell_state_change_1.feature` を新規作成し、少なくとも次を追加する。

```gherkin
Feature: Quantum Katas BasicGates Task 1.8 BellStateChange1
  Task 1.8 BellStateChange1: |Φ⁺⟩ を |Φ⁻⟩ に変える
  入力:
  2 量子ビットの Bell 状態 |Φ⁺⟩ = (|00⟩ + |11⟩) / sqrt(2)
  目標:
  状態を |Φ⁻⟩ = (|00⟩ - |11⟩) / sqrt(2) に変える

  Scenario: Task 1.8 は |Φ⁺⟩ を |Φ⁻⟩ に変換する
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add Z --qubit 0 --step 2" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.7071067811865475,0.0,0.0,-0.7071067811865475
      """

  Scenario: Task 1.8 は symbolic 表示で |Φ⁻⟩ を示す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add Z --qubit 0 --step 2" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      <actual symbolic output>
      """

  Scenario: Task 1.8 の controlled 検証回路は |000⟩ に戻る
    Given 空の 3 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add H --control 0 --qubit 1 --step 1" を実行
    And "qni add X --control 1 --qubit 2 --step 2" を実行
    And "qni add Z --control 0 --qubit 1 --step 3" を実行
    And "qni add Z --control 0 --qubit 1 --step 4" を実行
    And "qni add X --control 1 --qubit 2 --step 5" を実行
    And "qni add H --control 0 --qubit 1 --step 6" を実行
    And "qni add H --qubit 0 --step 7" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0
      """
```

symbolic の expected は、実出力を確認してから固定する。

- [ ] **Step 2: focused 実行で red / green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/bell_state_change_1.feature
```

Expected:

- 少なくとも symbolic / controlled のどこで不足があるかを 1 箇所に切り分けられる
- 既存機能で足りる部分はそのまま PASS

- [ ] **Step 3: feature-first の追加をコミットする**

```bash
git add features/katas/basic_gates/bell_state_change_1.feature
git commit -m "test: add Task 1.8 kata scenarios"
```

## Task 2: 2 qubit symbolic の最小回帰を追加して green にする

**Files:**
- Modify: `features/qni_run.feature`
- Modify: `lib/qni/symbolic_state_renderer.rb`
- Modify: `libexec/qni_symbolic_run.py`
- Optionally modify: `features/qni_expect.feature`

- [ ] **Step 1: 失敗原因を 1 箇所に絞る**

想定する失敗原因は次に限る。

- `qni run --symbolic` が 2 qubit 回路を拒否する
- 2 qubit で `H`, `Z`, controlled-`X` の symbolic 適用が足りない
- 3 qubit controlled 検証が既存 `qni run` / `qni expect` で書けない

- [ ] **Step 2: 既存 feature に 2 qubit symbolic の最小回帰を追加する**

`features/qni_run.feature` に、Bell 状態の symbolic 表示を確認する最小シナリオを追加する。

- [ ] **Step 3: Python helper と Ruby 境界を最小拡張する**

2 qubit 限定で `qni run --symbolic` を拡張する。

- Python helper は長さ 4 の状態ベクトルと gate 適用を実装する
- 最低限 `H`, `Z`, controlled-`X`, controlled-`Z` を扱う
- Ruby 側は 2 qubit 回路を許可し、helper エラーを既存の `Simulator::Error` に変換する

- [ ] **Step 4: `Task 1.8` feature を再実行して green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/bell_state_change_1.feature
```

Expected:

- `Task 1.8` の feature が PASS

- [ ] **Step 5: 必要な修正をコミットする**

```bash
git add features/katas/basic_gates/bell_state_change_1.feature features/qni_run.feature features/qni_expect.feature lib/qni/symbolic_state_renderer.rb libexec/qni_symbolic_run.py
git commit -m "feat: support Task 1.8 bell state verification"
```

実際に触った file のみ `git add` する。

## Task 3: 近接回帰を確認する

**Files:**
- Test: `features/qni_run.feature`
- Test: `features/qni_expect.feature`
- Test: `features/katas/basic_gates/global_phase_change.feature`
- Test: `features/katas/basic_gates/bell_state_change_1.feature`

- [ ] **Step 1: 近接 feature をまとめて実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/qni_run.feature \
  features/qni_expect.feature \
  features/katas/basic_gates/global_phase_change.feature \
  features/katas/basic_gates/bell_state_change_1.feature
```

Expected:

- すべて PASS

- [ ] **Step 2: 近接回帰の green をコミットする**

```bash
git commit --allow-empty -m "test: verify Task 1.8 regressions"
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
