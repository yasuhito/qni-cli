# Phase Change High-Level DSL Design

## Problem

現在の [phase_change.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-phase-change-rewrite/features/katas/basic_gates/phase_change.feature) は、

- `qni add P --angle ...`
- `qni variable set alpha ...`
- `qni run`
- numeric CSV の比較
- controlled 検証 scenario

が前面に出ており、すでに高レベル化した

- [state_flip.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-phase-change-rewrite/features/katas/basic_gates/state_flip.feature)
- [basis_change.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-phase-change-rewrite/features/katas/basic_gates/basis_change.feature)
- [sign_flip.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-phase-change-rewrite/features/katas/basic_gates/sign_flip.feature)
- [phase_flip.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-phase-change-rewrite/features/katas/basic_gates/phase_flip.feature)

の読み口から外れている。

そのため、Task 1.6 の本質である

- `|0>` は変わらない
- `|1>` にだけ `exp(iθ)` が掛かる
- `θ = π/2` では PhaseFlip と同じ `|+> -> |+i>` が見える
- 一般には `α|0> + β|1>` が `α|0> + exp(iθ)β|1>` になる

が scenario から直接読み取りにくい。

さらに、現状の feature は角度に `alpha`、振幅に `β` / `γ` を使っていて、これまでの高レベル kata で揃ってきた `θ` / `α` / `β` の記号系とも少しずれている。

## Goal

- [phase_change.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-phase-change-rewrite/features/katas/basic_gates/phase_change.feature) を Task 1.1〜1.5 と同じ高レベル DSL に書き換える
- 主語は `P(θ)` ではなく「位相回転」にして、task の数学的意味を前面に出す
- 角度は `θ`、振幅は `α` / `β` に寄せて読みやすくする
- controlled 検証 scenario は外し、1 qubit の状態変化に集中する

## Non-Goals

- `qni run --symbolic --basis z` のような新しい basis API を増やすこと
- 多 qubit の一般化を同時に設計すること
- Bloch 球や期待値ベースの検証を feature DSL に混ぜること
- `P(θ)` の pretty-print をこの spec の中で完成させること

## Approaches Considered

### 1. ゲート中心に `P(θ)` を主語にする

例:

```gherkin
Scenario: P(θ) は |1> を exp(iθ)|1> に変える
```

- 実装に忠実
- すでにある ASCII 回路とも一致しやすい

ただし、Task 1.6 の主題はゲート名そのものではなく「一般角の位相回転」なので、学習者には記号が先に見えやすい。

### 2. 概念中心に「位相回転」を主語にする

例:

```gherkin
Scenario: 位相回転は |1> に exp(iθ) を掛ける
```

- Task の数学的意味がそのまま読める
- [phase_flip.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-phase-change-rewrite/features/katas/basic_gates/phase_flip.feature) の `S ゲートは ...` を「固定角の特別な位相回転」として自然につなげられる
- 回路は `When 次の回路を適用:` で具体的に見せられる

### 3. 概念中心にしつつ専用 DSL を追加する

例:

```gherkin
When 位相を θ だけ回転:
```

- かなり読みやすい
- ただし Task 1.1〜1.5 で揃えた `When 次の回路を適用:` のリズムから外れる
- task 専用 DSL をこれ以上増やさないほうが全体の一貫性は高い

## Decision

Approach 2 を採用する。

- feature の説明文と scenario 名は「位相回転」を主語にする
- 回路自体は既存 DSL のまま `When 次の回路を適用:` で `P` ゲートを見せる
- 角度記号は `θ` に統一し、振幅の一般式は `α|0> + β|1>` にする
- Task 1.5 とのつながりを見せるため、`θ = π/2` の具体例として `|+> -> |+i>` を 1 本入れる

この方針なら、ゲート名と数学的意味の両方が見えるが、主役はあくまで「位相回転」になる。

## Feature Shape

書き換え後の [phase_change.feature](/home/yasuhito/Work/qni-cli/.worktrees/codex-phase-change-rewrite/features/katas/basic_gates/phase_change.feature) は、次の 4 本を基本形とする。

### 1. `|0>` の不変性

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
```

### 2. `|1>` への一般角位相

```gherkin
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
```

### 3. `θ = π/2` の具体例

```gherkin
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
```

これは Task 1.5 PhaseFlip が `S = P(π/2)` の特別な場合であることも自然に示せる。

### 4. 一般式

```gherkin
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

## Notes on Formatting

`Then 状態ベクトルは:` の期待値は、人間には

```text
α|0> + exp(iθ)β|1>
```

の順が読みやすい。

一方で現在の symbolic helper は `β*exp(I*theta)` のような並びを出す可能性がある。実装では次のどちらかを選べばよい。

- symbolic renderer 側を少し整えて `exp(iθ)β` に寄せる
- step comparison helper で、`β*exp(iθ)` と `exp(iθ)β` を同値として扱う

この spec の目的は feature を高レベルに読みやすくすることなので、どちらの実装手段を採るかは plan で決めればよい。

## Why This Shape Is Better

- Task 1.6 の本質が「一般角の位相回転」だと、scenario 名だけで分かる
- `S` は固定角の special case、`P(θ)` はその一般化、という流れが自然につながる
- `When 次の回路を適用:` を維持するので、Task 1.1〜1.5 と DSL の rhythm が崩れない
- `θ = π/2` の具体例で、位相のイメージを Task 1.5 の `|+i>` に接続できる
