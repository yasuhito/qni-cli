# BasicGates Task 1.5 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BasicGates Task 1.5 PhaseFlip` を `features/katas/basic_gates/phase_flip.feature` に追加し、Quantum Katas の `DumpDiffOnOneQubit` と controlled 等価性検証の意図を `qni-cli` 側で再現する。

**Architecture:** 先に `phase_flip.feature` を追加して、既存の `S`、`S†`、controlled 指定、`qni run`、`qni run --symbolic`、`qni expect` だけで task を表現できるかを確認する。`Task 1.5` は self-adjoint ではないため、controlled 検証では candidate の controlled-`S` と inverse の controlled-`S†` を組にして control qubit が `|0⟩` に戻ることを見る。不足が出た場合のみ、feature-first で新しい spec / plan に戻る。

**Tech Stack:** Ruby, Cucumber, Bundler, `qni-cli`

---

## File Structure

- Create: `features/katas/basic_gates/phase_flip.feature`
  - `Task 1.5` の問題文、`DumpDiffOnOneQubit` 相当の数値シナリオ、controlled 等価性検証、symbolic 補助シナリオを追加する。
- Verify: `features/add_s_gate.feature`
  - `qni add S` の既存挙動が回帰していないことを確認する。
- Verify: `features/add_s_dagger_gate.feature`
  - controlled 検証で使う `S†` の既存挙動が回帰していないことを確認する。
- Verify: `features/qni_run.feature`
  - 数値 run と symbolic run が回帰していないことを確認する。
- Verify: `features/qni_expect.feature`
  - `qni expect` の出力が controlled 検証で回帰していないことを確認する。
- Verify: `features/katas/basic_gates/state_flip.feature`
  - `Task 1.1` が回帰していないことを確認する。
- Verify: `features/katas/basic_gates/basis_change.feature`
  - `Task 1.2` が回帰していないことを確認する。
- Verify: `features/katas/basic_gates/sign_flip.feature`
  - `Task 1.3` が回帰していないことを確認する。
- Verify: `features/katas/basic_gates/amplitude_change.feature`
  - `Task 1.4` が回帰していないことを確認する。

## Task 1: `Task 1.5` feature を先に追加して既存機能で足りるか確認する

**Files:**
- Create: `features/katas/basic_gates/phase_flip.feature`
- Test: `features/katas/basic_gates/phase_flip.feature`

- [ ] **Step 1: `Task 1.5` の問題文とシナリオを書く**

`features/katas/basic_gates/phase_flip.feature` を新規作成し、少なくとも次を追加する。

```gherkin
Feature: Quantum Katas BasicGates Task 1.5 PhaseFlip
  Task 1.5 PhaseFlip: |1⟩ 成分にだけ位相 i を掛ける
  入力:
  1 量子ビットの状態 |ψ⟩ = α|0⟩ + β|1⟩
  目標:
  状態を α|0⟩ + iβ|1⟩ に変える

  Scenario: Task 1.5 は 0.6|0> + 0.8|1> の |1> 成分に i を掛ける
    Given 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    And "qni add S --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.6,0.8i
      """

  Scenario: Task 1.5 の controlled 検証回路は control qubit を |0> に戻す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    And "qni add S --control 0 --qubit 1 --step 2" を実行
    And "qni add Sdg --control 0 --qubit 1 --step 3" を実行
    And "qni add H --qubit 0 --step 4" を実行
    When "qni expect ZI" を実行
    Then 標準出力:
      """
      ZI=1.0
      """

  Scenario: Task 1.5 は symbolic 表示で位相 i を示す
    Given 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    And "qni add S --qubit 0 --step 1" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      0.6|0> + 0.8*I|1>
      """
```

- [ ] **Step 2: focused 実行で red / green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/phase_flip.feature
```

Expected:

- 既存機能で足りるならそのまま PASS
- 失敗した場合は、何が不足かを `S` / `Sdg` / controlled / symbolic のどこかに切り分けられる

- [ ] **Step 3: failing でも green でも、feature-first の追加をコミットする**

```bash
git add features/katas/basic_gates/phase_flip.feature
git commit -m "test: add Task 1.5 kata scenarios"
```

## Task 2: 必要なら最小修正で green にする

**Files:**
- Modify: `features/katas/basic_gates/phase_flip.feature`
- Optionally modify: `features/add_s_gate.feature`
- Optionally modify: `features/add_s_dagger_gate.feature`
- Optionally modify: `features/qni_run.feature`
- Optionally modify: `features/qni_expect.feature`
- Optionally modify: `lib/qni/...`

- [ ] **Step 1: 失敗原因を 1 箇所に絞る**

想定する失敗原因は次に限る。

- `qni add S --control ...` が受理されない
- `qni add Sdg --control ...` が受理されない
- `qni run --symbolic` の複素係数表記が expected と違う
- `qni expect ZI` の丸め差で exact 比較が落ちる

ここで複数の原因が見えた場合でも、最初に 1 つだけ直す。

- [ ] **Step 2: product code 不足がある場合は、既存 feature に最小回帰を追加する**

不足が product code にある場合だけ、対応する既存 feature に最小シナリオを追加する。

例:

- `features/add_s_gate.feature`
  - controlled `S` が回路に保存できること
- `features/add_s_dagger_gate.feature`
  - controlled `Sdg` が回路に保存できること
- `features/qni_run.feature`
  - `S` 適用後に複素係数を数値 / symbolic の両方で表示できること
- `features/qni_expect.feature`
  - controlled `S` と `Sdg` を含む回路で `ZI` が 1 に戻ること

- [ ] **Step 3: 必要な最小実装だけを入れる**

実装変更は、実際に失敗した箇所のみに限定する。

- gate 登録の不足なら、その gate と controlled 指定の受理
- symbolic 表示の不足なら、複素係数の表記整形
- expect の丸め差だけなら、既存の近似比較 step を使う方向を優先する

新しい CLI コマンドや汎用検証機能は追加しない。

- [ ] **Step 4: `Task 1.5` feature を再実行して green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/phase_flip.feature
```

Expected:

- `Task 1.5` の 3 シナリオが PASS

- [ ] **Step 5: 必要な修正をコミットする**

```bash
git add features/katas/basic_gates/phase_flip.feature features/add_s_gate.feature features/add_s_dagger_gate.feature features/qni_run.feature features/qni_expect.feature lib/qni
git commit -m "feat: support Task 1.5 phase flip verification"
```

`lib/qni` に変更がない場合は、実際に触った file だけ `git add` する。

## Task 3: 近接回帰を確認する

**Files:**
- Test: `features/add_s_gate.feature`
- Test: `features/add_s_dagger_gate.feature`
- Test: `features/qni_run.feature`
- Test: `features/qni_expect.feature`
- Test: `features/katas/basic_gates/state_flip.feature`
- Test: `features/katas/basic_gates/basis_change.feature`
- Test: `features/katas/basic_gates/sign_flip.feature`
- Test: `features/katas/basic_gates/amplitude_change.feature`
- Test: `features/katas/basic_gates/phase_flip.feature`

- [ ] **Step 1: 近接 feature をまとめて実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/add_s_gate.feature \
  features/add_s_dagger_gate.feature \
  features/qni_run.feature \
  features/qni_expect.feature \
  features/katas/basic_gates/state_flip.feature \
  features/katas/basic_gates/basis_change.feature \
  features/katas/basic_gates/sign_flip.feature \
  features/katas/basic_gates/amplitude_change.feature \
  features/katas/basic_gates/phase_flip.feature
```

Expected:

- すべて PASS

- [ ] **Step 2: 近接回帰の green をコミットする**

```bash
git commit --allow-empty -m "test: verify Task 1.5 regressions"
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
rake rubocop
rake reek
rake flog
rake flay
```

Expected:

- すべて PASS

- [ ] **Step 3: 統合前の状態を確認する**

Run:

```bash
git status --short
git log --oneline --decorate -5
```

Expected:

- 作業ツリーがクリーン
- `Task 1.5` 関連コミットが確認できる
