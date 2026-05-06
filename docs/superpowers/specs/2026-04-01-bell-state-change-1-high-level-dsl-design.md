# BellStateChange1 の高レベル DSL 設計

## 問題

現在の [bell_state_change_1.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/bell_state_change_1.feature) は、

- `qni add H ...`
- `qni add X --control ...`
- 数値 CSV の比較
- 制御付き検証回路

が前面に出ており、[state_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/state_flip.feature) から [global_phase_change.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/global_phase_change.feature) までで整ってきた高レベル DSL の流れから外れている。

そのため、課題 1.8 の本質である

- `|Φ+>` を `|Φ->` に変える
- Bell 状態を Bell 基底のまま読む
- 一般には Bell 基底上の論理量子ビットに `Z` が作用する

がシナリオから直接読み取りにくい。

また、現状の DSL には次がない。

- `|Φ+>`, `|Φ->`, `|Ψ+>`, `|Ψ->` の短縮表記
- `qni run --symbolic --basis bell`
- `Then Bell 基底での状態ベクトルは:`

このため、課題 1.8 を課題 1.1〜1.7 と同じ温度感で書くには、Bell 基底を第一級の概念として扱える必要がある。

## 目的

- [bell_state_change_1.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/bell_state_change_1.feature) を高レベル DSL に書き換える
- Bell 状態を計算基底へ展開せず、そのまま `|Φ+>` / `|Φ->` で読めるようにする
- `qni state set` と `Given 初期状態ベクトルは:` で Bell 状態の短縮表記を正式サポートする
- CLI に `qni run --symbolic --basis bell` を追加し、ステップ定義でも再利用する

## 対象外

- 3 量子ビット以上のエンタングル基底を追加すること
- Bell 基底以外の 2 量子ビット基底を同時に追加すること
- 制御付き検証シナリオを残すこと
- Bell 基底の数値表示や測定 DSL まで同時に広げること

## 検討した案

### 1. シナリオ名だけ高レベルにして、中身は計算基底のままにする

- シナリオ名は `Z ゲートは |Φ+> を |Φ-> に変える`
- ただし期待出力は `sqrt(2)/2|00> - sqrt(2)/2|11>`

最小実装ではあるが、課題 1.8 の主語と期待出力の視点がずれる。

### 2. 初期状態だけ Bell 状態の短縮表記にし、結果は計算基底のままにする

- `Given 初期状態ベクトルは: |Φ+>`
- `Then 状態ベクトルは: sqrt(2)/2|00> - sqrt(2)/2|11>`

入り口は自然になるが、結果が Bell 状態の課題らしく読めない。

### 3. Bell 基底を第一級の概念にし、入力も出力も Bell 基底で読めるようにする

- `qni state set "|Φ+>"`
- `qni run --symbolic --basis bell`
- `Then Bell 基底での状態ベクトルは:`

課題 1.8 を最も自然に書けるうえ、課題 1.9 以降の Bell 系の課題にも再利用しやすい。

## 決定

案 3 を採用する。

- Bell 状態の短縮表記を `InitialState` の正式入力として追加する
- CLI に `qni run --symbolic --basis bell` を追加する
- ステップ定義に `Then Bell 基底での状態ベクトルは:` を追加する
- [bell_state_change_1.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/bell_state_change_1.feature) は制御付きシナリオを外し、高レベル DSL にそろえる

## ユーザー向け API

### Bell 状態の短縮表記

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

v1 ではパーサー内で具体的な計算基底の 2 量子ビット状態に展開してよい。

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

v1 では 2 量子ビット限定とする。

また、次も受け付ける。

```text
qni state set "|Φ+>"
qni state set "α|Φ+> + β|Φ->"
```

`qni state show` は、保存時に Bell 状態の短縮表記を使った場合は Bell 基底のまま表示してよい。

### ステップ定義

次を追加する。

```gherkin
Then Bell 基底での状態ベクトルは:
```

内部では `qni run --symbolic --basis bell` を使い、Bell 基底での記号表示と比較する。

## Bell 基底表示

任意の 2 量子ビットの記号状態

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
- `sqrt(2)/2` や `α` など厳密な記号表示を保つ
- 項順は `|Φ+>`, `|Φ->`, `|Ψ+>`, `|Ψ->`

## BellStateChange1 の機能仕様の形

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

## 検証方針

- [features/qni_state.feature](/home/yasuhito/Work/qni-cli/features/qni_state.feature) に Bell 状態の短縮表記の受け入れ仕様を追加する
- [features/qni_run.feature](/home/yasuhito/Work/qni-cli/features/qni_run.feature) に `--basis bell` の受け入れ仕様を追加する
- [bell_state_change_1.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/bell_state_change_1.feature) は高レベル DSL に書き換える
- 既存の計算基底・X 基底・Y 基底表示を壊していないことを全体チェックで確認する
