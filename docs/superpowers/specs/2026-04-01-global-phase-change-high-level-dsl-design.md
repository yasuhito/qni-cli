# Global Phase Change High-Level DSL Design

## Problem

現在の [global_phase_change.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-global-phase-rewrite/features/katas/basic_gates/global_phase_change.feature) は、

- controlled 検証回路
- `qni expect ZI`
- 低レベルな `qni add Rz ...`

が前面に出ていて、すでに高レベル化した

- [state_flip.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-global-phase-rewrite/features/katas/basic_gates/state_flip.feature)
- [sign_flip.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-global-phase-rewrite/features/katas/basic_gates/sign_flip.feature)
- [phase_flip.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-global-phase-rewrite/features/katas/basic_gates/phase_flip.feature)
- [phase_change.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-global-phase-rewrite/features/katas/basic_gates/phase_change.feature)

の読み口から外れている。

そのため、Task 1.7 の本質である

- 状態全体に `-1` を掛ける
- `α|0⟩ + β|1⟩` が `-α|0⟩ - β|1⟩` になる
- これは単独 qubit では観測できないが、`qni` の symbolic 表示では読むことができる

が scenario から直接読み取りにくい。

## Goal

- [global_phase_change.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-global-phase-rewrite/features/katas/basic_gates/global_phase_change.feature) を Task 1.1〜1.6 と同じ高レベル DSL に書き換える
- 主語は `Rz(2π)` ではなく「グローバル位相変化」にして、task の数学的意味を前面に出す
- controlled 検証 scenario は外し、1 qubit の symbolic 状態変化に集中する
- 「物理的には観測できないが、symbolic 表示では読める」という注意点は feature header に残す

## Non-Goals

- global phase の観測可能性そのものを `qni` に新しく実装すること
- controlled 検証回路を高レベル DSL に移し替えること
- `qni expect` や Bloch 球の検証を Task 1.7 の kata feature に混ぜること
- 2 qubit 以上の一般化を同時に設計すること

## Approaches Considered

### 1. ゲート中心に `Rz(2π)` を主語にする

例:

```gherkin
Scenario: Rz(2π) は α|0> + β|1> を -α|0> - β|1> に変える
```

- 実装に忠実
- `When 次の回路を適用:` と整合しやすい

ただし、Task 1.7 の主題は `Rz` という記号より「状態全体に -1 を掛ける」という効果なので、学習者にはゲート名が先に見えやすい。

### 2. 概念中心に「グローバル位相変化」を主語にする

例:

```gherkin
Scenario: グローバル位相変化は α|0> + β|1> を -α|0> - β|1> に変える
```

- Task 1.7 の数学的意味がそのまま読める
- [phase_change.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-global-phase-rewrite/features/katas/basic_gates/phase_change.feature) の「位相回転は ...」に自然につながる
- 回路自体は `When 次の回路を適用:` で具体的に見せられる

### 3. controlled 検証を補助 scenario として残す

- 元の Quantum Katas の厳密さには近い
- ただし高レベルで読みやすい kata という今の方向性から大きく外れる
- Task 1.7 だけ突然 `qni expect ZI` に戻るので、流れが崩れる

## Decision

Approach 2 を採用する。

- feature header と scenario 名は「グローバル位相変化」を主語にする
- 回路自体は既存 DSL のまま `When 次の回路を適用:` で `Rz(2π)` を見せる
- controlled 検証 scenario は削除する
- 「単独の qubit では観測できないが、qni の symbolic 表示では状態全体に `-1` が掛かった形を読める」と明記する

この方針なら、Task 1.7 の意味が scenario 名だけで分かりつつ、実装上は最小変更で既存 DSL に乗せられる。

## Feature Shape

書き換え後の [global_phase_change.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-global-phase-rewrite/features/katas/basic_gates/global_phase_change.feature) は、次の 3 本を基本形とする。

### 1. `|0>` への作用

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
```

### 2. 具体例

```gherkin
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
```

### 3. 一般式

```gherkin
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

## Notes on Semantics

Task 1.7 の重要な注意点は、「グローバル位相は単独の qubit では物理的に観測できない」ということにある。

ただし `qni` の kata feature は、ここで「物理観測可能性」をテストしたいのではなく、

- 数学的には状態全体に `-1` が掛かる
- `qni run --symbolic` ではその形が読める

ことを高レベルに学べるようにしたい。

したがって、この feature では controlled 検証は外し、header に注意点を残すのが最も自然である。

## Why This Shape Is Better

- Task 1.7 の本質が「状態全体に -1 を掛ける」と scenario 名だけで分かる
- Task 1.5 / 1.6 に続く「位相の学習の流れ」の最後として自然に読める
- `When 次の回路を適用:` を維持するので、Task 1.1〜1.6 と DSL の rhythm が崩れない
- controlled 検証を外すことで、feature が `qni-cli` の高レベル教材 DSL として一貫する
