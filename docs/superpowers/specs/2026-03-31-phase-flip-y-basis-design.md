# Phase Flip の高レベル Y 基底設計

## 問題

現在の [phase_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/phase_flip.feature) は、

- `qni add S ...`
- `qni run`
- 数値 CSV の比較
- 制御付き検証回路

が前面に出ており、[state_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/state_flip.feature) から [amplitude_change.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/amplitude_change.feature) までで整ってきた高レベル DSL の流れから外れている。

そのため、タスク 1.5 の本質である

- `|0>` は変わらない
- `|1>` にだけ位相 `i` が掛かる
- `|+>` が `|+i>` に回る
- 一般には `α|0> + β|1>` が `α|0> + iβ|1>` になる

がシナリオから直接読み取りにくい。

さらに、現状の DSL には次がない。

- `|+i>` / `|-i>` 短縮表記
- `qni run --symbolic --basis y`
- `Then |+i>, |-i> 基底での状態ベクトルは:`

このため、PhaseFlip を基底の見方まで含めて自然に表すには、

- 計算基底で `α|0> + iβ|1>`
- Y 基底で `|+i>` / `|-i>`

の両方を機能仕様で素直に書ける必要がある。

## 目標

- [phase_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/phase_flip.feature) をタスク 1.1〜1.4 と同じ高レベル DSL に書き換える
- `S` ゲートの効果を計算基底と Y 基底の両方から自然に読めるようにする
- `|+i>` / `|-i>` を初期状態の短縮表記として正式サポートする
- CLI に `qni run --symbolic --basis y` を追加し、ステップ定義でも再利用する

## 対象外

- 2 量子ビット以上の Y 基底表示を追加すること
- `|++i>` など多量子ビットの短縮表記を追加すること
- `T` や `P` など他の位相ゲートにも同時に専用 DSL を広げること
- 制御付き検証シナリオを残すこと

## 検討した案

### 1. `phase_flip.feature` だけ最小限書き換え、Y 基底は増やさない

- `S ゲートは |0> を変えない`
- `S ゲートは |1> に i を掛ける`
- `S ゲートは α|0> + β|1> を α|0> + iβ|1> に変える`

までならすぐ書ける。

ただし `|+> -> |+i>` が機能仕様で自然に読めず、タスク 1.5 の幾何学的な見え方が抜ける。

### 2. `|+i>` / `|-i>` 短縮表記だけ追加し、表示基底は増やさない

- 初期状態や期待値に `|+i>` / `|-i>` を書けるようにする
- ただし内部表示は計算基底のままなので、比較ヘルパーで変換する必要がある

この案でも機能仕様は多少読みやすくなるが、`basis_change.feature` の `|+>, |-> 基底での状態ベクトルは:` ほど自然ではない。

### 3. `|+i>` / `|-i>` 短縮表記と Y 基底表示を一緒に正式サポートする

- `qni run --symbolic --basis y`
- `Then |+i>, |-i> 基底での状態ベクトルは:`
- `qni state set "|+i>"` / `qni state set "|-i>"`

をそろえる案。

タスク 1.5 の高レベルな機能仕様を最も自然に書けるうえ、今後 `S`, `S†`, `P`, `Rz` の説明にも再利用しやすい。

## 決定

案 3 を採用する。

- `|+i>` / `|-i>` を `InitialState` の正式な短縮表記として追加する
- CLI に `qni run --symbolic --basis y` を追加する
- ステップ定義に `Then |+i>, |-i> 基底での状態ベクトルは:` を追加する
- [phase_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/phase_flip.feature) は制御付きシナリオを外し、タスク 1.1〜1.4 と同じ読み口へそろえる

## ユーザー向け API

### Y 基底の短縮表記

次を正式サポートする。

```text
|+i>
|-i>
```

意味はそれぞれ次とする。

```text
|+i> = (|0> + i|1>) / sqrt(2)
|-i> = (|0> - i|1>) / sqrt(2)
```

第 1 段ではパーサー内で具体的な 2 項の状態に展開してよい。

### CLI

次を追加する。

```text
qni run --symbolic --basis y
```

v1 では X 基底と同様に 1 量子ビット限定とする。

また、次も受け付ける。

```text
qni state set "|+i>"
qni state set "|-i>"
```

`qni state show` は、保存時に短縮表記を使った場合は短縮表記のまま表示してよい。

### ステップ定義

次を追加する。

```gherkin
Then |+i>, |-i> 基底での状態ベクトルは:
```

内部では `qni run --symbolic --basis y` を使い、Y 基底での記号表示と比較する。

## PhaseFlip 機能仕様の形

書き換え後の [phase_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/phase_flip.feature) は、次の 4 本を基本形とする。

### 1. 基底状態

```gherkin
Scenario: S ゲートは |0> を変えない
  Given 初期状態ベクトルは:
    """
    |0>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ S ├
        └───┘
    """
  Then 状態ベクトルは:
    """
    |0>
    """
```

```gherkin
Scenario: S ゲートは |1> に i を掛ける
  Given 初期状態ベクトルは:
    """
    |1>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ S ├
        └───┘
    """
  Then 状態ベクトルは:
    """
    i|1>
    """
```

### 2. Y 基底での見え方

```gherkin
Scenario: S ゲートは |+> を |+i> に変える
  Given 初期状態ベクトルは:
    """
    |+>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ S ├
        └───┘
    """
  Then |+i>, |-i> 基底での状態ベクトルは:
    """
    |+i>
    """
```

### 3. 一般状態

```gherkin
Scenario: S ゲートは α|0> + β|1> を α|0> + iβ|1> に変える
  Given 初期状態ベクトルは:
    """
    α|0> + β|1>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ S ├
        └───┘
    """
  Then 状態ベクトルは:
    """
    α|0> + iβ|1>
    """
```

具体例として `0.6|0> + 0.8|1>` を残してもよいが、`α/β` の一般式が入ればタスクの本質は十分表せる。

## テスト方針

- [features/qni_run.feature](/home/yasuhito/Work/qni-cli/features/qni_run.feature) に `--basis y` の受け入れ確認を追加する
- [features/qni_state.feature](/home/yasuhito/Work/qni-cli/features/qni_state.feature) に `|+i>` / `|-i>` 短縮表記の受け入れ確認を追加する
- [phase_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/phase_flip.feature) は高レベル DSL に書き換える
- 既存の `|+>, |->` 基底表示や計算基底比較を壊していないことを全体チェックで確認する
