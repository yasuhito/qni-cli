# Sign Flip Plus/Minus Initial State Design

## Problem

現在の [sign_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/sign_flip.feature) は、

- `qni add H ...`
- `qni add Z ...`
- `qni run`
- 数値 CSV 出力の比較

という low-level な書き方になっている。

そのため、Task 1.1 の [state_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/state_flip.feature) や Task 1.2 の [basis_change.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/basis_change.feature) と比べると、

- `|+> -> |->`
- `|-> -> |+>`
- `α|0> + β|1> -> α|0> - β|1>`

という課題の本質が scenario から直接読み取りにくい。

さらに、現在の `Given 初期状態ベクトルは:` は `|0>`, `|1>`, `α|0> + β|1>` のような計算基底中心の記法は扱えるが、

- `|+>`
- `|->`

を初期状態として直接置けない。

そのため SignFlip を本当に自然な DSL で書こうとすると、

- 初期状態は `|+>` や `|->`
- 回路は `Z`
- 結果は `|+>, |->` 基底で読む

という構図をそのまま feature に落とせない。

## Goal

- `Given 初期状態ベクトルは:` で `|+>` と `|->` を直接受け付ける
- 必要なら CLI の `qni state set "|+>"` / `qni state set "|->"` でも同じ shorthand を使えるようにする
- [sign_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/sign_flip.feature) を Task 1.1 / 1.2 と同じ高レベル DSL に書き換える
- SignFlip の学習目標を `|+>, |->` 基底と計算基底の両方から読みやすくする

## Non-Goals

- `|+i>` や `|-i>` など Y 基底の shorthand を追加すること
- 一般の `sqrt(2)/2|0> + sqrt(2)/2|1>` 形式を fully symbolic に parse すること
- 2 qubit 以上の `|++>` などを同時にサポートすること
- controlled 検証 scenario を再び導入すること

## Approaches Considered

### 1. `sign_flip.feature` だけ低レベルのまま残す

- 実装は不要
- ただし Task 1.1 / 1.2 と DSL が揃わず、読みやすさの流れが途切れる

### 2. `|+>` / `|->` を feature step 専用の sugar としてだけ追加する

- `Given 初期状態ベクトルは:` の内部でだけ `|+>` / `|->` を認識する
- 変更範囲は小さい
- ただし CLI の `qni state set` とは表現が分かれ、エージェントからの対話的利用でも一貫しない

### 3. `InitialState` の正式 shorthand として `|+>` / `|->` を追加する

- feature DSL と CLI が同じ表現を共有できる
- 今後 `basis_change.feature` や対話実験でも自然に使える
- 実装はやや広いが、`|+>` / `|->` だけなら範囲は still small

## Decision

Approach 3 を採用する。

- `InitialState.parse` で `|+>` / `|->` を正式サポートする
- [features/step_definitions/cli_steps.rb](/home/yasuhito/Work/qni-cli/features/step_definitions/cli_steps.rb) の `Given 初期状態ベクトルは:` はそのまま恩恵を受ける
- [lib/qni/state_file.rb](/home/yasuhito/Work/qni-cli/lib/qni/state_file.rb) 経由の `qni state set` でも同じ shorthand が使えるようにする

これにより、SignFlip は

- 初期状態を `|+>` / `|->` で置き
- 回路を `Z`
- 結果を `|+>, |->` 基底または計算基底で読む

という理想形へ寄せられる。

## User-Facing API

### Initial State DSL

これらを受け付けるようにする。

```text
|+>
|->
```

意味は次の shorthand とする。

```text
|+> = (|0> + |1>) / sqrt(2)
|-> = (|0> - |1>) / sqrt(2)
```

第 1 段では parser 内で直接 concrete な 2 項 state に展開してよい。

### CLI

次のような入力を受け付ける。

```text
qni state set "|+>"
qni state set "|->"
```

`qni state show` は、保存された初期状態が `|+>` / `|->` と等価なとき、

- shorthand のまま表示するか
- 正規化済みの ket sum を表示するか

のどちらかを選ぶ必要がある。

第 1 段では **表示も shorthand を優先** する。
学習者にとって `|+>` / `|->` のまま見えるほうが価値が高いからである。

## SignFlip Feature Shape

書き換え後の [sign_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/sign_flip.feature) は、次の方向を目指す。

### 1. `|+>` と `|->` の変換

```gherkin
Scenario: Z ゲートは |+> を |-> に変える
  Given 初期状態ベクトルは:
    """
    |+>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ Z ├
        └───┘
    """
  Then |+>, |-> 基底での状態ベクトルは:
    """
    |->
    """
```

```gherkin
Scenario: Z ゲートは |-> を |+> に変える
  Given 初期状態ベクトルは:
    """
    |->
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ Z ├
        └───┘
    """
  Then |+>, |-> 基底での状態ベクトルは:
    """
    |+>
    """
```

### 2. 計算基底で見た符号反転

```gherkin
Scenario: Z ゲートは 0.6|0> + 0.8|1> を 0.6|0> - 0.8|1> に変える
  Given 初期状態ベクトルは:
    """
    0.6|0> + 0.8|1>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ Z ├
        └───┘
    """
  Then 計算基底での状態ベクトルは:
    """
    0.6|0> - 0.8|1>
    """
```

### 3. 一般状態

```gherkin
Scenario: Z ゲートは実数係数の一般状態で |1> の振幅の符号を反転する
  Given 初期状態ベクトルは:
    """
    cos(θ/2)|0> + sin(θ/2)|1>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ Z ├
        └───┘
    """
  Then 計算基底での状態ベクトルは:
    """
    cos(θ/2)|0> - sin(θ/2)|1>
    """
```

```gherkin
Scenario: Z ゲートは α|0> + β|1> を α|0> - β|1> に変える
  Given 初期状態ベクトルは:
    """
    α|0> + β|1>
    """
  When 次の回路を適用:
    """
        ┌───┐
    q0: ┤ Z ├
        └───┘
    """
  Then 計算基底での状態ベクトルは:
    """
    α|0> - β|1>
    """
```

## Internal Design

### 1. `InitialState`

[lib/qni/initial_state.rb](/home/yasuhito/Work/qni-cli/lib/qni/initial_state.rb) に `|+>` / `|->` の special-case parse を追加する。

最小案:

- `InitialState.parse('|+>')`
  - `Term('0', PLUS_MINUS_COEFFICIENT)`
  - `Term('1', PLUS_MINUS_COEFFICIENT)`
- `InitialState.parse('|->')`
  - `Term('0', PLUS_MINUS_COEFFICIENT)`
  - `Term('1', NEGATED_PLUS_MINUS_COEFFICIENT)`

ここで coefficient は parser がすでに扱える concrete number とする。
つまり第 1 段では、

- `0.7071067811865476`
- `-0.7071067811865476`

のように内部へ落としてよい。

この方針なら、

- `resolve_numeric`
- JSON serialization
- simulator

を大きく変えずに済む。

### 2. Canonical Display

`InitialState#to_s` や `qni state show` は、保存された state が `|+>` / `|->` と tolerance 内で一致するなら、shorthand を返すようにしてよい。

そうしないと、

```text
0.7071067811865476|0> + 0.7071067811865476|1>
```

が見えてしまい、学習用途の価値が下がる。

### 3. Step Definitions

[features/step_definitions/cli_steps.rb](/home/yasuhito/Work/qni-cli/features/step_definitions/cli_steps.rb) は、`Qni::InitialState.parse` に通すだけなので、`InitialState` 側が shorthand を理解すれば追加変更は最小で済む。

必要なのは、

- comparison 側で `|+>` / `|->` がそのまま扱えること
- `Then 計算基底での状態ベクトルは:`
- `Then |+>, |-> 基底での状態ベクトルは:`

の役割分担を SignFlip でも徹底すること

である。

## Controlled Scenario

Task 1.1 と同じ考えで、controlled 検証 scenario は削除する。

理由:

- 高レベル教材 DSL という方向性から外れる
- SignFlip の主題は `Z` の作用そのもの
- `|+>`, `|->` と計算基底の両方で十分に学習目標を表現できる

## Testing

先に feature を更新する。

### New / Updated Features

- `features/qni_state.feature`
  - `qni state set "|+>"` / `qni state show`
- `features/katas/basic_gates/sign_flip.feature`
  - high-level DSL に全面書き換え

### Unit Tests

- `test/qni/initial_state_test.rb`
  - `InitialState.parse('|+>')`
  - `InitialState.parse('|->')`
  - `to_s` が shorthand を返すこと

### Verification

- `bundle exec ruby -Itest test/qni/initial_state_test.rb`
- `bundle exec cucumber features/qni_state.feature features/katas/basic_gates/sign_flip.feature`
- 最後に `bundle exec rake check`

## Expected Outcome

SignFlip は Task 1.1 / 1.2 と同じレベルで、

- 初期状態
- 適用する回路
- 期待する状態変化

をそのまま読める feature になる。

特に `|+>` と `|->` を初期状態として直接置けることで、

- `Z` が `|+>` を `|->` に変える
- `Z` が `|->` を `|+>` に変える

という task のタイトルそのものを scenario にできるようになる。
