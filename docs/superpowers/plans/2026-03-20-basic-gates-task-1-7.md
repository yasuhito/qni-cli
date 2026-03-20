# BasicGates Task 1.7 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BasicGates Task 1.7 GlobalPhaseChange` を `features/katas/basic_gates/global_phase_change.feature` に追加し、Quantum Katas の controlled 等価性検証を `qni-cli` 側で再現する。

**Architecture:** 先に `global_phase_change.feature` を追加し、既存の `Rz`、angle expression、`qni run --symbolic`、`qni expect`、controlled 指定だけで task を表現できるかを確認する。`Task 1.7` は単独の 1 qubit では観測できないグローバル位相を扱うため、feature の中心は controlled 検証とし、symbolic は補助説明として追加する。必要なら実際の symbolic 出力を見てから expected を固定する。

**Tech Stack:** Ruby, Cucumber, Bundler, `qni-cli`

---

## File Structure

- Create: `features/katas/basic_gates/global_phase_change.feature`
  - `Task 1.7` の問題文、controlled 検証シナリオ、symbolic 補助シナリオを追加する。
- Optionally modify: `features/qni_run.feature`
  - `Rz(2π)` の symbolic 出力が未保証なら最小回帰を追加する。
- Optionally modify: `features/qni_expect.feature`
  - controlled `Rz(2π)` / `Rz(-2π)` を含む回路で `ZI` が 1 に戻ることが未保証なら最小回帰を追加する。
- Optionally modify: `lib/qni/...`
  - `Rz(2π)` の表現や symbolic 出力に本当の不足がある場合だけ最小実装を入れる。
- Verify: `features/katas/basic_gates/phase_change.feature`
  - `Task 1.6` が回帰していないことを確認する。

## Task 1: `Task 1.7` feature を先に追加して既存機能で足りるか確認する

**Files:**
- Create: `features/katas/basic_gates/global_phase_change.feature`
- Test: `features/katas/basic_gates/global_phase_change.feature`

- [ ] **Step 1: `Task 1.7` の問題文とシナリオを書く**

`features/katas/basic_gates/global_phase_change.feature` を新規作成し、少なくとも次を追加する。

```gherkin
Feature: Quantum Katas BasicGates Task 1.7 GlobalPhaseChange
  Task 1.7 GlobalPhaseChange: 状態全体に -1 を掛ける
  入力:
  1 量子ビットの状態 β|0⟩ + γ|1⟩
  目標:
  状態を -β|0⟩ - γ|1⟩ に変える
  注意:
  単独の qubit ではグローバル位相は観測できないため、controlled 版で確認する

  Scenario: Task 1.7 の controlled 検証回路は control qubit を |0> に戻す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    And "qni add Rz --angle 2π --control 0 --qubit 1 --step 2" を実行
    And "qni add Rz --angle -2π --control 0 --qubit 1 --step 3" を実行
    And "qni add H --qubit 0 --step 4" を実行
    When "qni expect ZI" を実行
    Then 期待値 "ZI" は 1.0 ± 1e-12
```

symbolic 補助シナリオは、`qni run --symbolic` の実出力を確認してから expected を固定する。

- [ ] **Step 2: focused 実行で red / green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/global_phase_change.feature
```

Expected:

- 少なくとも controlled / symbolic のどこで不足があるかを 1 箇所に切り分けられる
- 既存機能で足りるならそのまま PASS

- [ ] **Step 3: feature-first の追加をコミットする**

```bash
git add features/katas/basic_gates/global_phase_change.feature
git commit -m "test: add Task 1.7 kata scenarios"
```

## Task 2: 必要なら最小修正で green にする

**Files:**
- Modify: `features/katas/basic_gates/global_phase_change.feature`
- Optionally modify: `features/qni_run.feature`
- Optionally modify: `features/qni_expect.feature`
- Optionally modify: `lib/qni/...`

- [ ] **Step 1: 失敗原因を 1 箇所に絞る**

想定する失敗原因は次に限る。

- `qni add Rz --angle 2π --control ...` が受理されない
- `qni add Rz --angle -2π --control ...` が受理されない
- `qni run --symbolic` の `Rz(2π)` 表示が expected と違う
- `qni expect ZI` の丸め差で exact 比較が落ちる

- [ ] **Step 2: product code 不足がある場合だけ既存 feature に最小回帰を追加する**

不足が product code にある場合のみ、対応する既存 feature に最小シナリオを追加する。

- [ ] **Step 3: 必要な最小実装だけを入れる**

実装変更は、実際に失敗した箇所のみに限定する。

- [ ] **Step 4: `Task 1.7` feature を再実行して green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/global_phase_change.feature
```

Expected:

- `Task 1.7` の feature が PASS

- [ ] **Step 5: 必要な修正をコミットする**

```bash
git add features/katas/basic_gates/global_phase_change.feature features/qni_run.feature features/qni_expect.feature lib/qni
git commit -m "feat: support Task 1.7 global phase verification"
```

`lib/qni` に変更がない場合は、実際に触った file だけ `git add` する。

## Task 3: 近接回帰を確認する

**Files:**
- Test: `features/qni_run.feature`
- Test: `features/qni_expect.feature`
- Test: `features/katas/basic_gates/phase_change.feature`
- Test: `features/katas/basic_gates/global_phase_change.feature`

- [ ] **Step 1: 近接 feature をまとめて実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/qni_run.feature \
  features/qni_expect.feature \
  features/katas/basic_gates/phase_change.feature \
  features/katas/basic_gates/global_phase_change.feature
```

Expected:

- すべて PASS

- [ ] **Step 2: 近接回帰の green をコミットする**

```bash
git commit --allow-empty -m "test: verify Task 1.7 regressions"
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
