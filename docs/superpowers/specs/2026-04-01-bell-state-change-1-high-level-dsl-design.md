# Bell State Change 1 High-Level DSL Design

## Problem

現在の [bell_state_change_1.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/bell_state_change_1.feature) は、

- `qni add H ...`
- `qni add X --control ...`
- numeric CSV の比較
- controlled 検証回路

が前面に出ており、[state_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/state_flip.feature) から [global_phase_change.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/global_phase_change.feature) までで整ってきた高レベル DSL の流れから外れている。

そのため、Task 1.8 の本質である

- `|Φ+>` を `|Φ->` に変える
- Bell 状態を Bell 基底のまま読む
- 一般には Bell 基底上の論理 qubit に `Z` が作用する

が scenario から直接読み取りにくい。

また、現状の DSL には次がない。

- `|Φ+>`, `|Φ->`, `|Ψ+>`, `|Ψ->` shorthand
- `qni run --symbolic --basis bell`
- `Then Bell 基底での状態ベクトルは:`

このため、Task 1.8 を Task 1.1〜1.7 と同じ温度感で書くには、Bell 基底を first-class に扱える必要がある。

## Goal

- [bell_state_change_1.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/bell_state_change_1.feature) を高レベル DSL に書き換える
- Bell 状態を計算基底へ展開せず、そのまま `|Φ+>` / `|Φ->` で読めるようにする
- `qni state set` と `Given 初期状態ベクトルは:` で Bell 状態 shorthand を正式サポートする
- CLI に `qni run --symbolic --basis bell` を追加し、feature step でも再利用する

## Non-Goals

- 3 qubit 以上の entangled basis を追加すること
- Bell 基底以外の 2 qubit 基底を同時に追加すること
- controlled 検証 scenario を残すこと
- Bell 基底の numeric 表示や測定 DSL まで同時に広げること

## Approaches Considered

### 1. Scenario 名だけ高レベルにして、中身は計算基底のままにする

- scenario 名は `Z ゲートは |Φ+> を |Φ-> に変える`
- ただし expected output は `sqrt(2)/2|00> - sqrt(2)/2|11>`

最小実装ではあるが、Task 1.8 の主語と expected output の視点がずれる。

### 2. 初期状態だけ Bell shorthand にし、結果は計算基底のままにする

- `Given 初期状態ベクトルは: |Φ+>`
- `Then 状態ベクトルは: sqrt(2)/2|00> - sqrt(2)/2|11>`

入り口は自然になるが、結果が Bell 状態 task らしく読めない。

### 3. Bell 基底を first-class にし、入力も出力も Bell 基底で読めるようにする

- `qni state set "|Φ+>"`
- `qni run --symbolic --basis bell`
- `Then Bell 基底での状態ベクトルは:`

Task 1.8 を最も自然に書けるうえ、Task 1.9 以降の Bell 系 task にも再利用しやすい。

## Decision

Approach 3 を採用する。

- Bell 状態 shorthand を `InitialState` の正式入力として追加する
- CLI に `qni run --symbolic --basis bell` を追加する
- feature step に `Then Bell 基底での状態ベクトルは:` を追加する
- [bell_state_change_1.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/bell_state_change_1.feature) は controlled scenario を外し、高レベル DSL にそろえる

## User-Facing API

### Bell State Shorthand

次を正式サポートする。

```text
|Φ+>
|Φ->
|Ψ+>
|Ψ->
```

意味はそれぞれ次とする。

```text
|Φ+> = (|00> + |11>) / sqrt(2)
|Φ-> = (|00> - |11>) / sqrt(2)
|Ψ+> = (|01> + |10>) / sqrt(2)
|Ψ-> = (|01> - |10>) / sqrt(2)
```

v1 では parser 内で concrete な計算基底の 2 qubit state に展開してよい。

また、次のような Bell 基底上の線形結合も正式サポートする。

```text
0.6|Φ+> + 0.8|Φ->
α|Φ+> + β|Φ->
```

### CLI

次を追加する。

```text
qni run --symbolic --basis bell
```

v1 では 2 qubit 限定とする。

また、次も受け付ける。

```text
qni state set "|Φ+>"
qni state set "α|Φ+> + β|Φ->"
```

`qni state show` は、保存時に Bell shorthand を使った場合は Bell 基底のまま表示してよい。

### Feature Steps

次を追加する。

```gherkin
Then Bell 基底での状態ベクトルは:
```

内部では `qni run --symbolic --basis bell` を使い、Bell 基底での symbolic 表示と比較する。

## Bell Basis Rendering

任意の 2 qubit symbolic state

```text
a|00> + b|01> + c|10> + d|11>
```

は、Bell 基底では次のように表せる。

```text
((a + d)/sqrt(2))|Φ+> + ((a - d)/sqrt(2))|Φ-> + ((b + c)/sqrt(2))|Ψ+> + ((b - c)/sqrt(2))|Ψ->
```

したがって `qni run --symbolic --basis bell` は、内部の計算基底状態をこの形へ変換して表示する。

v1 では次を優先する。

- 0 係数の項は省く
- `sqrt(2)/2` や `α` など exact symbolic 表示を保つ
- 項順は `|Φ+>`, `|Φ->`, `|Ψ+>`, `|Ψ->`

## BellStateChange1 Feature Shape

書き換え後の [bell_state_change_1.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/bell_state_change_1.feature) は、次の 4 本を基本形とする。

### 1. 基底状態

```gherkin
Scenario: Z ゲートは |Φ+> を |Φ-> に変える
  Given 初期状態ベクトルは:
    """
    |Φ+>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ Z ├
        └───┘
    q1: ─────
    """
  Then Bell 基底での状態ベクトルは:
    """
    |Φ->
    """
```

```gherkin
Scenario: Z ゲートは |Φ-> を |Φ+> に変える
  Given 初期状態ベクトルは:
    """
    |Φ->
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ Z ├
        └───┘
    q1: ─────
    """
  Then Bell 基底での状態ベクトルは:
    """
    |Φ+>
    """
```

### 2. 具体例

```gherkin
Scenario: 0.6|Φ+> + 0.8|Φ-> に Z ゲートを適用すると、Bell 基底では 0.6|Φ-> + 0.8|Φ+> になる
  Given 初期状態ベクトルは:
    """
    0.6|Φ+> + 0.8|Φ->
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ Z ├
        └───┘
    q1: ─────
    """
  Then Bell 基底での状態ベクトルは:
    """
    0.6|Φ-> + 0.8|Φ+>
    """
```

### 3. 一般状態

```gherkin
Scenario: α|Φ+> + β|Φ-> に Z ゲートを適用すると、Bell 基底では α|Φ-> + β|Φ+> になる
  Given 初期状態ベクトルは:
    """
    α|Φ+> + β|Φ->
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ Z ├
        └───┘
    q1: ─────
    """
  Then Bell 基底での状態ベクトルは:
    """
    α|Φ-> + β|Φ+>
    """
```

## Testing Strategy

- [features/qni_state.feature](/home/yasuhito/Work/qni-cli/features/qni_state.feature) に Bell shorthand の acceptance を追加する
- [features/qni_run.feature](/home/yasuhito/Work/qni-cli/features/qni_run.feature) に `--basis bell` の acceptance を追加する
- [bell_state_change_1.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/bell_state_change_1.feature) は高レベル DSL に書き換える
- 既存の計算基底・X 基底・Y 基底表示を壊していないことを full check で確認する

