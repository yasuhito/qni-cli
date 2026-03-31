# Phase Change High-Level DSL Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `phase_change.feature` を Task 1.1〜1.5 と同じ高レベル DSL に書き換え、Task 1.6 の本質である「一般角の位相回転」を scenario からそのまま読めるようにする。

**Architecture:** 先に [phase_change.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-phase-change-rewrite/features/katas/basic_gates/phase_change.feature) を concept-centered な high-level scenario へ赤く書き換える。次に [features/step_definitions/cli_steps.rb](/home/yasuhito/Work/qni-cli/.worktrees/codex-phase-change-rewrite/features/step_definitions/cli_steps.rb) の symbolic 比較 helper だけを最小限拡張し、`exp(iθ)` や `exp(iθ)β` の人間向け表記を既存の `qni run --symbolic` 出力と同値に扱えるようにして green にする。

**Tech Stack:** Ruby, Cucumber, Bundler, existing high-level kata DSL, `cli_steps.rb`, `qni run --symbolic`

---

## File Structure

- Modify: `features/katas/basic_gates/phase_change.feature`
  - low-level な `qni add P ...` / numeric CSV 比較 / controlled 検証を、高レベル DSL の 1-qubit scenario へ置き換える。
- Modify: `features/step_definitions/cli_steps.rb`
  - `Then 状態ベクトルは:` の symbolic 比較 helper を拡張し、`exp(iθ)` 形式と乗算順の差を最小限 canonicalize する。
- Verify: `features/katas/basic_gates/phase_flip.feature`
  - Task 1.5 の `|+i>` / `|-i>` DSL が Task 1.6 の rewrite で回帰していないことを確認する。
- Verify: `features/katas/basic_gates/state_flip.feature`
  - 既存の `Then 状態ベクトルは:` 比較が壊れていないことを確認する。
- Verify: `features/qni_run.feature`
  - `qni run --symbolic` の既存 acceptance が比較 helper の変更で影響を受けていないことを full check で確認する。

## Task 1: `phase_change.feature` を高レベル DSL に先に書き換えて赤くする

**Files:**
- Modify: `features/katas/basic_gates/phase_change.feature`
- Test: `features/katas/basic_gates/phase_change.feature`

- [ ] **Step 1: feature header を Task 1.6 の数学に合わせて整理する**

`features/katas/basic_gates/phase_change.feature` の導入文を、少なくとも次の内容へ寄せる。

- 角度は `θ`
- 入力状態は `α|0⟩ + β|1⟩`
- 目標は `α|0⟩ + exp(iθ)β|1⟩`

- [ ] **Step 2: low-level scenario を 4 本の high-level scenario に置き換える**

feature を次の方向へ更新する。

```gherkin
Scenario: 位相回転は |0> を変えない
  Given 初期状態ベクトルは:
    """
    |0>
    """
  When 次の回路を適用:
    """
         θ
        ┌──┐
    q0: ┤ P├
        └──┘
    """
  Then 状態ベクトルは:
    """
    |0>
    """

Scenario: 位相回転は |1> に exp(iθ) を掛ける
  Given 初期状態ベクトルは:
    """
    |1>
    """
  When 次の回路を適用:
    """
         θ
        ┌──┐
    q0: ┤ P├
        └──┘
    """
  Then 状態ベクトルは:
    """
    exp(iθ)|1>
    """

Scenario: θ = π/2 の位相回転は |+> を |+i> に変える
  Given 初期状態ベクトルは:
    """
    |+>
    """
  When 次の回路を適用:
    """
        π/2
        ┌──┐
    q0: ┤ P├
        └──┘
    """
  Then |+i>, |-i> 基底での状態ベクトルは:
    """
    |+i>
    """

Scenario: 位相回転は α|0> + β|1> を α|0> + exp(iθ)β|1> に変える
  Given 初期状態ベクトルは:
    """
    α|0> + β|1>
    """
  When 次の回路を適用:
    """
         θ
        ┌──┐
    q0: ┤ P├
        └──┘
    """
  Then 状態ベクトルは:
    """
    α|0> + exp(iθ)β|1>
    """
```

この task で controlled 検証 scenario は削除する。

- [ ] **Step 3: focused cucumber で red を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/phase_change.feature
```

Expected:

- `exp(iθ)` と現在の symbolic 出力 `exp(I*theta)` の差
- `exp(iθ)β` と現在の symbolic 出力 `beta*exp(I*theta)` の差

で fail する。

- [ ] **Step 4: failing feature をコミットする**

```bash
git add features/katas/basic_gates/phase_change.feature
git commit -m "test: rewrite phase change scenarios"
```

## Task 2: symbolic 比較 helper を位相回転の記法に合わせて最小拡張する

**Files:**
- Modify: `features/step_definitions/cli_steps.rb`
- Test: `features/katas/basic_gates/phase_change.feature`

- [ ] **Step 1: comparison の赤テストを helper 観点で固定する**

Task 1 の red を再実行して、失敗理由が次の 2 種に限定されていることを確認する。

- `exp(iθ)` と `exp(I*theta)` の表記差
- `exp(iθ)β` と `beta*exp(I*theta)` の乗算順差

- [ ] **Step 2: `exp(iθ)` 形式を canonicalize する helper を追加する**

`features/step_definitions/cli_steps.rb` に、少なくとも次を吸収する最小 helper を追加する。

- `exp(iθ)` -> `exp(i*theta)`
- `exp(iπ/2)` -> `exp(i*pi/2)`
- `exp(iθ)β` -> 比較用 canonical form

実装方針は次のどちらかに絞る。

- expected 側を `beta*exp(i*theta)` に寄せる
- actual / expected の両方を同じ phase-product canonical form に寄せる

この task では YAGNI でよい。Task 1.6 で使う形だけを通せれば十分。

- [ ] **Step 3: `Then 状態ベクトルは:` が既存 scenario を壊さないことを意識して実装する**

比較 helper の変更は、既存の

- `|0>`
- `α|0> + β|1>`
- `i|1>`
- `sqrt(2)/2|0> + sqrt(2)/2|1>`

などの canonicalization を壊さない最小変更にとどめる。

- [ ] **Step 4: focused feature を green にする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/phase_change.feature
```

Expected:

- 4 scenario が PASS
- `θ = π/2` の scenario が `|+i>` で green
- 一般式 scenario が `α|0> + exp(iθ)β|1>` で green

- [ ] **Step 5: helper 実装をコミットする**

```bash
git add features/step_definitions/cli_steps.rb features/katas/basic_gates/phase_change.feature
git commit -m "feat: support high-level phase change DSL"
```

## Task 3: 近接 kata の読み口と回帰を確認する

**Files:**
- Verify: `features/katas/basic_gates/phase_change.feature`
- Verify: `features/katas/basic_gates/phase_flip.feature`
- Verify: `features/katas/basic_gates/state_flip.feature`

- [ ] **Step 1: phase 系 kata をまとめて実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/state_flip.feature \
  features/katas/basic_gates/phase_flip.feature \
  features/katas/basic_gates/phase_change.feature
```

Expected:

- PASS
- Task 1.5 の `S` と Task 1.6 の一般位相回転が、連続した教材として読める

- [ ] **Step 2: scenario 名と step の視点が揃っていることを目視確認する**

Check:

- `phase_flip.feature` は固定角 `i`
- `phase_change.feature` は一般角 `exp(iθ)`
- どちらも `When 次の回路を適用:` を使っている

- [ ] **Step 3: 回帰確認をコミットする**

```bash
git add features/katas/basic_gates/phase_change.feature features/step_definitions/cli_steps.rb
git commit -m "test: verify phase kata DSL progression"
```

## Task 4: full check を fresh に通す

**Files:**
- Verify: repo-wide checks

- [ ] **Step 1: symbolic runtime を先に整える**

Run:

```bash
bash scripts/setup_symbolic_python.sh
```

Expected:

- SymPy version が表示される

- [ ] **Step 2: repo 全体の品質チェックを実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec rake check
```

Expected:

- cucumber PASS
- RuboCop PASS
- reek PASS
- flog / flay PASS

- [ ] **Step 3: 最終差分を確認する**

Check:

- 変更が `phase_change.feature` と `cli_steps.rb` 中心に収まっている
- unrelated な CLI / renderer / basis API の変更が入っていない

- [ ] **Step 4: 最終 commit を追加する**

```bash
git add features/katas/basic_gates/phase_change.feature features/step_definitions/cli_steps.rb
git commit -m "test: complete phase change high-level DSL"
```

- [ ] **Step 5: integration handoff**

If the branch is clean and `rake check` passed, merge or prepare PR using the repo’s usual completion flow.
