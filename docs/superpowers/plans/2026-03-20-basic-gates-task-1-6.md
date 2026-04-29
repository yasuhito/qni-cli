# BasicGates Task 1.6 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BasicGates Task 1.6 PhaseChange` を `features/katas/basic_gates/phase_change.feature` に追加し、Quantum Katas の `DumpDiffOnOneQubit` と `alpha = 0..36` の controlled 等価性検証を `qni-cli` 側で再現する。

**Architecture:** 先に `phase_change.feature` を追加し、既存の `P`、angle expression、`qni run`、`qni run --symbolic`、`qni expect`、controlled 指定だけで task を表現できるかを確認する。`Task 1.6` は self-adjoint ではないため、controlled 検証では candidate の `controlled-P(alpha)` と inverse の `controlled-P(-alpha)` を組にして control qubit が `|0⟩` に戻ることを見る。不足が出た場合のみ、feature-first で最小の product 修正を追加する。

**Tech Stack:** Ruby, Cucumber, Bundler, `qni-cli`

---

## File Structure

- Create: `features/katas/basic_gates/phase_change.feature`
  - `Task 1.6` の問題文、`dumpAlpha = 5π/9` の人間向けシナリオ、`alpha = 0..36` の controlled 走査、symbolic 補助シナリオを追加する。
- Optionally modify: `features/add/add_phase_gate.feature.md`
  - controlled `P` を回路に保存できることが未保証なら最小回帰を追加する。
- Optionally modify: `features/qni_run.feature`
  - `P(alpha)` の symbolic 表示や複素数出力が未保証なら最小回帰を追加する。
- Optionally modify: `features/qni_expect.feature`
  - controlled `P(alpha)` / `P(-alpha)` を含む回路で `ZI` が 1 に戻ることが未保証なら最小回帰を追加する。
- Optionally modify: `lib/qni/...`
  - `controlled P` か symbolic 表示に本当の不足がある場合だけ最小実装を入れる。
- Verify: `features/katas/basic_gates/amplitude_change.feature`
  - `Task 1.4` が回帰していないことを確認する。
- Verify: `features/katas/basic_gates/phase_flip.feature`
  - `Task 1.5` が回帰していないことを確認する。

## Task 1: `Task 1.6` feature を先に追加して既存機能で足りるか確認する

**Files:**
- Create: `features/katas/basic_gates/phase_change.feature`
- Test: `features/katas/basic_gates/phase_change.feature`

- [ ] **Step 1: `Task 1.6` の問題文とシナリオを書く**

`features/katas/basic_gates/phase_change.feature` を新規作成し、少なくとも次を追加する。

```gherkin
Feature: Quantum Katas BasicGates Task 1.6 PhaseChange
  Task 1.6 PhaseChange: |1⟩ 成分に一般角の位相を掛ける
  入力:
  角度 alpha
  1 量子ビットの状態 β|0⟩ + γ|1⟩
  目標:
  |0⟩ はそのままにし、|1⟩ を exp(i*alpha)|1⟩ に変える

  Scenario: Task 1.6 は dumpAlpha = 5π/9 で非自明状態を変換する
    Given 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    And "qni add P --angle 5π/9 --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      <actual dumpAlpha output>
      """

  Scenario Outline: Task 1.6 の controlled 検証回路は alpha を走査して control qubit を |0> に戻す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    And "qni add P --angle alpha --control 0 --qubit 1 --step 2" を実行
    And "qni variable set alpha <alpha>" を実行
    And "qni add P --angle -alpha --control 0 --qubit 1 --step 3" を実行
    And "qni add H --qubit 0 --step 4" を実行
    When "qni expect ZI" を実行
    Then 期待値 "ZI" は 1.0 ± 1e-12

    Examples:
      | alpha  |
      | 0      |
      | π/18   |
      | 2π/18  |
      | 3π/18  |
      | 4π/18  |
      | 5π/18  |
      | 6π/18  |
      | 7π/18  |
      | 8π/18  |
      | π/2    |
      | 10π/18 |
      | 11π/18 |
      | 12π/18 |
      | 13π/18 |
      | 14π/18 |
      | 15π/18 |
      | 16π/18 |
      | 17π/18 |
      | π      |
      | 19π/18 |
      | 20π/18 |
      | 21π/18 |
      | 22π/18 |
      | 23π/18 |
      | 24π/18 |
      | 25π/18 |
      | 26π/18 |
      | 3π/2   |
      | 28π/18 |
      | 29π/18 |
      | 30π/18 |
      | 31π/18 |
      | 32π/18 |
      | 33π/18 |
      | 34π/18 |
      | 35π/18 |
      | 2π     |

  Scenario: Task 1.6 は symbolic 表示で一般式を示す
    Given "qni add P --angle alpha --qubit 0 --step 0" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      <actual symbolic output>
      """
```

- [ ] **Step 2: focused 実行で red / green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/phase_change.feature
```

Expected:

- 少なくとも dump / controlled / symbolic のどこで不足があるかを 1 箇所に切り分けられる
- 既存機能で足りるならそのまま PASS

- [ ] **Step 3: feature-first の追加をコミットする**

```bash
git add features/katas/basic_gates/phase_change.feature
git commit -m "test: add Task 1.6 kata scenarios"
```

## Task 2: 必要なら最小修正で green にする

**Files:**
- Modify: `features/katas/basic_gates/phase_change.feature`
- Optionally modify: `features/add/add_phase_gate.feature.md`
- Optionally modify: `features/qni_run.feature`
- Optionally modify: `features/qni_expect.feature`
- Optionally modify: `lib/qni/...`

- [ ] **Step 1: 失敗原因を 1 箇所に絞る**

想定する失敗原因は次に限る。

- `qni add P --angle ... --control ...` が受理されない
- `qni add P --angle -alpha --control ...` が受理されない
- `qni run --symbolic` の `P(alpha)` 表示が expected と違う
- `qni expect ZI` の丸め差で exact 比較が落ちる

- [ ] **Step 2: product code 不足がある場合だけ既存 feature に最小回帰を追加する**

不足が product code にある場合のみ、対応する既存 feature に最小シナリオを追加する。

例:

- `features/add/add_phase_gate.feature.md`
  - controlled `P` が回路に保存できること
- `features/qni_run.feature`
  - `P(alpha)` を未束縛変数付きで symbolic 表示できること
- `features/qni_expect.feature`
  - controlled `P(alpha)` と `P(-alpha)` を含む回路で `ZI` が 1 に戻ること

- [ ] **Step 3: 必要な最小実装だけを入れる**

実装変更は、実際に失敗した箇所のみに限定する。

- controlled `P` の表現力不足なら、その受理と保存
- symbolic 表示不足なら、`P(alpha)` の出力整形
- expect の丸め差だけなら、既存の近似比較 step を使う方向を優先する

新しい CLI コマンドや汎用検証機能は追加しない。

- [ ] **Step 4: `Task 1.6` feature を再実行して green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/phase_change.feature
```

Expected:

- `Task 1.6` の feature が PASS

- [ ] **Step 5: 必要な修正をコミットする**

```bash
git add features/katas/basic_gates/phase_change.feature features/add/add_phase_gate.feature.md features/qni_run.feature features/qni_expect.feature lib/qni
git commit -m "feat: support Task 1.6 phase change verification"
```

`lib/qni` に変更がない場合は、実際に触った file だけ `git add` する。

## Task 3: 近接回帰を確認する

**Files:**
- Test: `features/add/add_phase_gate.feature.md`
- Test: `features/qni_run.feature`
- Test: `features/qni_expect.feature`
- Test: `features/katas/basic_gates/amplitude_change.feature`
- Test: `features/katas/basic_gates/phase_flip.feature`
- Test: `features/katas/basic_gates/phase_change.feature`

- [ ] **Step 1: 近接 feature をまとめて実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/add/add_phase_gate.feature.md \
  features/qni_run.feature \
  features/qni_expect.feature \
  features/katas/basic_gates/amplitude_change.feature \
  features/katas/basic_gates/phase_flip.feature \
  features/katas/basic_gates/phase_change.feature
```

Expected:

- すべて PASS

- [ ] **Step 2: 近接回帰の green をコミットする**

```bash
git commit --allow-empty -m "test: verify Task 1.6 regressions"
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

- [ ] **Step 3: 統合前の状態を確認する**

Run:

```bash
git status --short
git log --oneline --decorate -5
```

Expected:

- 作業ツリーがクリーン
- `Task 1.6` 関連コミットが確認できる
