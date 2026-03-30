# Amplitude Change High-Level DSL Design

## Problem

現在の [amplitude_change.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/amplitude_change.feature) は、

- `qni add Ry --angle ...`
- `qni variable set alpha ...`
- `qni run`
- 数値 CSV 出力の比較
- controlled 検証 scenario

という low-level な書き方になっている。

そのため、すでに高レベル化した

- [state_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/state_flip.feature)
- [basis_change.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/basis_change.feature)
- [sign_flip.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/sign_flip.feature)

と比べると、

- `|0> -> cos(θ)|0> + sin(θ)|1>`
- `|1> -> -sin(θ)|0> + cos(θ)|1>`
- 一般状態の振幅回転

という task の本質が scenario から直接読み取りにくい。

また、Task 1.4 の実装は `Ry(2θ)` で自然に表せるが、feature 上で `2θ` を毎回見せると、

- 学習者には「なぜ 2 倍なのか」がノイズになりやすい
- task の主題である「振幅を θ だけ回転する」が隠れやすい

という問題がある。

## Goal

- [amplitude_change.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/amplitude_change.feature) を 1 qubit の状態変化を高レベルに読む feature へ書き換える
- `Ry(2θ)` の実装詳細を feature から隠し、「振幅を θ だけ回転する」という task の意味をそのまま読めるようにする
- 既存の
  - `Given 初期状態ベクトルは:`
  - `Then 状態ベクトルは:`
  を活かしつつ、最小の DSL 拡張で済ませる
- symbolic 一般式 scenario も Task 1.1 / 1.3 と同じ読みやすさへ寄せる

## Non-Goals

- controlled 検証 scenario を残すこと
- `Ry(2θ)` を ASCII 回路として常に明示すること
- 2 qubit 以上の振幅回転 DSL を同時に設計すること
- Bloch 球や幾何学的説明を feature DSL に直接埋め込むこと

## Approaches Considered

### 1. `Ry(2θ)` をそのまま `次の回路を適用:` に書く

例:

```gherkin
When 次の回路を適用:
  """
      ┌─────────┐
  q0: ┤ Ry(2θ) ├
      └─────────┘
  """
```

- 既存 DSL にそのまま乗る
- 実装の追加は少ない
- ただし `2θ` が task の意味より前に出てしまい、読みやすさが下がる

### 2. 振幅回転専用の high-level step を足す

例:

```gherkin
When 振幅を θ だけ回転:
```

- task の意図が最もストレートに読める
- `Ry(2θ)` の内部実装を隠せる
- 追加 DSL は 1 step で済む

### 3. `状態ベクトル` 以外の専用出力 step も増やす

例:

- `Then 回転後の振幅は:`
- `Then 回転行列の作用は:`

- 説明力は高い
- ただし DSL が task 依存に広がりすぎる
- 既存の kata feature との一貫性が下がる

## Decision

Approach 2 を採用する。

- 新しい step として `When 振幅を {angle} だけ回転:` を追加する
- 内部ではその step が `Ry(2*angle)` の 1-step 回路を append する
- feature では `Ry` ではなく「振幅回転」という task の意味を前面に出す
- 結果確認は既存の `Then 状態ベクトルは:` を使う

これにより、Task 1.4 も Task 1.1 / 1.2 / 1.3 と同じく、

- 初期状態を置く
- 操作を高レベルに述べる
- 結果状態を読む

という形へ揃えられる。

## User-Facing DSL

### New Step

新しく次の step を追加する。

```gherkin
When 振幅を θ だけ回転:
```

`θ` の部分には、既存の角度表現に準じて次を受け付ける。

- `θ`
- `theta`
- `π/3`
- `2π/3`
- `-π/4`

第 1 段では doc string は持たず、1 行 step とする。

### Internal Meaning

この step は内部で次に等価とする。

```text
Ry(2*θ)
```

つまり task 文脈での「振幅を θ だけ回転する」を、実装上の `Ry(2θ)` へ写像する。

## Feature Shape

書き換え後の [amplitude_change.feature](/home/yasuhito/Work/qni-cli/features/katas/basic_gates/amplitude_change.feature) は、次の 4 本を基本形とする。

### 1. `|0>` の回転

```gherkin
Scenario: 振幅回転は |0> を cos(θ)|0> + sin(θ)|1> に変える
  Given 初期状態ベクトルは:
    """
    |0>
    """
  When 振幅を θ だけ回転:
  Then 状態ベクトルは:
    """
    cos(θ)|0> + sin(θ)|1>
    """
```

### 2. `|1>` の回転

```gherkin
Scenario: 振幅回転は |1> を -sin(θ)|0> + cos(θ)|1> に変える
  Given 初期状態ベクトルは:
    """
    |1>
    """
  When 振幅を θ だけ回転:
  Then 状態ベクトルは:
    """
    -sin(θ)|0> + cos(θ)|1>
    """
```

### 3. 数値例

```gherkin
Scenario: θ = π/3 の振幅回転は 0.6|0> + 0.8|1> を -0.3928203230275509|0> + 0.9196152422706633|1> に変える
  Given 初期状態ベクトルは:
    """
    0.6|0> + 0.8|1>
    """
  When 振幅を π/3 だけ回転:
  Then 状態ベクトルは:
    """
    -0.3928203230275509|0> + 0.9196152422706633|1>
    """
```

### 4. 一般式

```gherkin
Scenario: 振幅回転は α|0> + β|1> を一般式どおりに変える
  Given 初期状態ベクトルは:
    """
    α|0> + β|1>
    """
  When 振幅を θ だけ回転:
  Then 状態ベクトルは:
    """
    (αcos(θ) - βsin(θ))|0> + (αsin(θ) + βcos(θ))|1>
    """
```

## Why This Shape Is Better

- `Ry(2θ)` の `2` という実装都合を feature から隠せる
- `Task 1.4` の主語が「振幅回転」になり、学習者の視点に近い
- 既存の高レベル kata と同じリズムで読める
- symbolic scenario も「回転行列の作用」がそのまま見える

## Internal Design

### 1. Step Definition

[features/step_definitions/cli_steps.rb](/home/yasuhito/Work/qni-cli/features/step_definitions/cli_steps.rb) に

```ruby
When('振幅を {string} だけ回転:') do |angle|
  ...
end
```

相当の step を追加する。

この step は内部で 1-qubit の回路

```json
{ "qubits": 1, "cols": [["Ry(2*theta)"]] }
```

のような 1 column を append する。

### 2. Angle Normalization

step は表示上の Greek 文字を受け付けつつ、内部では既存の ASCII angle parser に寄せる。

最小案:

- `θ` -> `theta`
- 空白除去

だけを行い、その結果を `Ry(2*...)` へ埋め込む。

### 3. Existing Infrastructure Reuse

数値 run と symbolic run は既存の `Ry` 実装をそのまま使う。

したがって追加実装は主に

- feature の書き換え
- `振幅を ... だけ回転` step
- 角度文字列の軽い正規化

に留められる。

## Risks

### 1. 一般式の期待値が長くなる

`α|0> + β|1>` の回転結果は、

```text
(αcos(θ) - βsin(θ))|0> + (αsin(θ) + βcos(θ))|1>
```

となり、Task 1.1 や 1.3 より少し複雑である。

ただしこれは task の数学そのものなので、省略せず見せる価値が高い。

### 2. `When` step が task 専用になる

`振幅を ... だけ回転` は Task 1.4 向けの domain-specific step である。

ただし 1 本だけで task の意味を大きく改善できるので、過剰な DSL 拡張とはみなさない。

## Follow-Up

この spec が承認されたら、次は implementation plan で以下を刻む。

- `amplitude_change.feature` の acceptance を先に高レベル化する
- `cli_steps.rb` に `When 振幅を ... だけ回転:` を追加する
- targeted cucumber で green にする
- fresh な `bundle exec rake check` を通す
