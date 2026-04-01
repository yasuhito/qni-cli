# Global Phase Change High-Level DSL Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `global_phase_change.feature` を Task 1.1〜1.6 と同じ高レベル DSL に書き換え、Task 1.7 の本質である「状態全体に -1 を掛ける」を scenario からそのまま読めるようにする。

**Architecture:** 先に [global_phase_change.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-global-phase-rewrite/features/katas/basic_gates/global_phase_change.feature) を high-level scenario へ赤く書き換え、controlled 検証を削る。次に既存の `Given 初期状態ベクトルは:`、`When 次の回路を適用:`、`Then 状態ベクトルは:` だけで green にできるかを確認し、追加実装が本当に不要かを focused cucumber で証明する。

**Tech Stack:** Ruby, Cucumber, Bundler, existing high-level kata DSL, `qni run --symbolic`, `Rz(2π)`

---

## File Structure

- Modify: `features/katas/basic_gates/global_phase_change.feature`
  - low-level な controlled 検証回路と `qni expect ZI` を、高レベル DSL の 1-qubit scenario へ置き換える。
- Verify: `features/step_definitions/cli_steps.rb`
  - 既存の `Then 状態ベクトルは:` 比較 helper だけで `-|0>`, `-α|0> - β|1>` が通ることを確認する。
- Verify: `features/katas/basic_gates/phase_change.feature`
  - Task 1.6 の一般位相回転と Task 1.7 のグローバル位相変化が連続した教材として読めることを確認する。
- Verify: `features/katas/basic_gates/phase_flip.feature`
  - Task 1.5 の固定角位相変化が回帰していないことを確認する。

## Task 1: `global_phase_change.feature` を高レベル DSL に先に書き換えて赤くする

**Files:**
- Modify: `features/katas/basic_gates/global_phase_change.feature`
- Test: `features/katas/basic_gates/global_phase_change.feature`

- [ ] **Step 1: feature header を Task 1.7 の数学に合わせて整理する**

`features/katas/basic_gates/global_phase_change.feature` の導入文を、少なくとも次の内容へ寄せる。

- 入力状態は `|ψ⟩ = α|0⟩ + β|1⟩`
- 目標は `-α|0⟩ - β|1⟩`
- 単独 qubit では観測できないが、`qni` の symbolic 表示では読める

- [ ] **Step 2: low-level scenario を high-level scenario に置き換える**

feature を次の方向へ更新する。

```gherkin
Scenario: グローバル位相変化は |0> を -|0> に変える
  Given 初期状態ベクトルは:
    """
    |0>
    """
  When 次の回路を適用:
    """
           2π
          ┌───┐
      q0: ┤ Rz├
          └───┘
    """
  Then 状態ベクトルは:
    """
    -|0>
    """

Scenario: グローバル位相変化は 0.6|0> + 0.8|1> を -0.6|0> - 0.8|1> に変える
  Given 初期状態ベクトルは:
    """
    0.6|0> + 0.8|1>
    """
  When 次の回路を適用:
    """
           2π
          ┌───┐
      q0: ┤ Rz├
          └───┘
    """
  Then 状態ベクトルは:
    """
    -0.6|0> - 0.8|1>
    """

Scenario: グローバル位相変化は α|0> + β|1> を -α|0> - β|1> に変える
  Given 初期状態ベクトルは:
    """
    α|0> + β|1>
    """
  When 次の回路を適用:
    """
           2π
          ┌───┐
      q0: ┤ Rz├
          └───┘
    """
  Then 状態ベクトルは:
    """
    -α|0> - β|1>
    """
```

この task で controlled 検証 scenario は削除する。

- [ ] **Step 3: focused cucumber で red を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/global_phase_change.feature
```

Expected:

- もし既存 helper だけで通るなら、その場で green でもよい
- fail する場合は `-|0>` や `-α|0> - β|1>` の比較差だけに理由が絞れている

- [ ] **Step 4: failing feature をコミットする**

```bash
git add features/katas/basic_gates/global_phase_change.feature
git commit -m "test: rewrite global phase change scenarios"
```

## Task 2: 追加実装が必要かを見極めて最小で green にする

**Files:**
- Modify only if needed: `features/step_definitions/cli_steps.rb`
- Test: `features/katas/basic_gates/global_phase_change.feature`

- [ ] **Step 1: focused feature の失敗理由を確認する**

Task 1 の結果を見て、次のどちらかに分岐する。

- green の場合:
  既存 DSL と比較 helper がそのまま Task 1.7 を支えられているので、この task は「追加実装不要」を確認するだけでよい。
- red の場合:
  失敗理由を 1 つの比較差へ絞る。

- [ ] **Step 2: 必要なら比較 helper を最小修正する**

もし fail するなら、`features/step_definitions/cli_steps.rb` に最小限の canonicalization を追加して、

- `-|0>`
- `-0.6|0> - 0.8|1>`
- `-α|0> - β|1>`

を既存の symbolic 出力と同値に扱えるようにする。

この task では YAGNI でよい。Task 1.7 で使う形だけを通せれば十分。

- [ ] **Step 3: focused feature を green にする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/global_phase_change.feature
```

Expected:

- 3 scenario が PASS
- `Rz(2π)` による全体 `-1` が高レベル DSL で読める

- [ ] **Step 4: 実装結果をコミットする**

追加実装があった場合:

```bash
git add features/katas/basic_gates/global_phase_change.feature features/step_definitions/cli_steps.rb
git commit -m "feat: support high-level global phase change DSL"
```

追加実装が不要だった場合:

```bash
git add features/katas/basic_gates/global_phase_change.feature
git commit -m "test: support high-level global phase change DSL"
```

## Task 3: 近接 kata の読み口と回帰を確認する

**Files:**
- Verify: `features/katas/basic_gates/phase_flip.feature`
- Verify: `features/katas/basic_gates/phase_change.feature`
- Verify: `features/katas/basic_gates/global_phase_change.feature`

- [ ] **Step 1: phase 系 kata をまとめて実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor bundle exec cucumber \
  features/katas/basic_gates/phase_flip.feature \
  features/katas/basic_gates/phase_change.feature \
  features/katas/basic_gates/global_phase_change.feature
```

Expected:

- PASS
- Task 1.5 の固定角位相
- Task 1.6 の一般角位相
- Task 1.7 のグローバル位相

が連続した教材として読める

- [ ] **Step 2: scenario 名と step の視点が揃っていることを目視確認する**

Check:

- `phase_flip.feature` は `S`
- `phase_change.feature` は「位相回転」
- `global_phase_change.feature` は「グローバル位相変化」
- どれも `When 次の回路を適用:` を使っている

- [ ] **Step 3: 回帰確認をコミットする**

```bash
git add features/katas/basic_gates/global_phase_change.feature
git commit -m "test: verify global phase kata progression"
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

- 変更が `global_phase_change.feature` 中心に収まっている
- helper を触った場合も、その変更が Task 1.7 に必要な最小範囲に収まっている

- [ ] **Step 4: 最終 commit を追加する**

```bash
git add features/katas/basic_gates/global_phase_change.feature features/step_definitions/cli_steps.rb
git commit -m "test: complete global phase change high-level DSL"
```

- [ ] **Step 5: integration handoff**

If the branch is clean and `rake check` passed, merge or prepare PR using the repo’s usual completion flow.
