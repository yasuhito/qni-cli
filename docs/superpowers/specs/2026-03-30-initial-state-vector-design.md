# Initial State Vector Design

## Problem

現在の `qni` は、初期状態を常に `|0...0⟩` とみなし、そこから回路を適用する前提で動いている。

- 数値実行は [lib/qni/state_vector.rb](/home/yasuhito/Work/qni-cli/lib/qni/state_vector.rb) の `StateVector.zero(qubits)` から始まる。
- symbolic 実行は [lib/qni/symbolic_state_renderer.rb](/home/yasuhito/Work/qni-cli/lib/qni/symbolic_state_renderer.rb) と [libexec/qni_symbolic_run.py](/home/yasuhito/Work/qni-cli/libexec/qni_symbolic_run.py) が回路を `|0...0⟩` に作用させて式を出している。
- feature DSL の `Given 初期状態ベクトルは:` は [features/step_definitions/cli_steps.rb](/home/yasuhito/Work/qni-cli/features/step_definitions/cli_steps.rb) で少数の文字列を gate 準備回路へ変換する簡易実装になっている。

この形だと、

- `qni state set "alpha|0> + beta|1>"` のように CLI から初期状態を直接設定できない。
- `alpha|0⟩ + beta|1⟩` のような symbolic な初期状態を first-class に扱えない。
- 数値 run と symbolic run の両方で同じ「初期状態」という概念を共有できない。

物理や量子情報の実務では、回路だけでなく「どの初期状態から始めるか」も同等に重要なので、これは `qni` の表現力の制約になっている。

## Goal

- 1 qubit の初期状態ベクトルを `qni` の正式な入力要素として追加する。
- CLI から `qni state set "alpha|0> + beta|1>"` のように設定できるようにする。
- `circuit.json` に初期状態を構造化して保存できるようにする。
- `qni run --symbolic` は未束縛の `alpha`, `beta` を含むまま symbolic に評価できるようにする。
- `qni run` は `qni variable set alpha ...` / `beta ...` で値を与えたあと、数値状態として実行できるようにする。

## Non-Goals

- 最初から任意 qubit 数の symbolic 初期状態を扱うこと
- `exp(i*phi)` や `sqrt(2)` など、一般の数式パーサをいきなり導入すること
- 数値シミュレータ本体を SymPy ベースへ置き換えること
- 既存の gate / variable / export 系機能を同時に全面再設計すること

## Decisions

- 第 1 段は **1 qubit のみ** を正式サポートする。
- 初期状態の式は **ket 和の 2 項** に限定する。
  - 例: `alpha|0> + beta|1>`
  - 例: `0.6|0> + 0.8|1>`
- 係数は当面、**変数名または数値リテラル** に限定する。
  - `alpha`, `beta`, `0.6`, `-0.8` は許可する。
  - `exp(i*phi)`, `sqrt(2)/2`, `(a+b)` は第 1 段では扱わない。
- Unicode の `α`, `β` は CLI / feature では許してもよいが、内部保存は ASCII の `alpha`, `beta` へ正規化する。
- symbolic 実行は SymPy を使って実装する。
- 数値実行は既存の `StateVector` ベースを維持し、初期状態の数値解決だけを追加する。

## User-Facing API

### CLI

新しい state サブコマンドを追加する。

```text
qni state set "alpha|0> + beta|1>"
qni state show
qni state clear
```

期待する振る舞い:

- `state set` は式を parse して `circuit.json` に保存する。
- `state show` は現在の初期状態を表示する。
- `state clear` は初期状態設定を削除し、既定の `|0>` 開始へ戻す。

### circuit.json

生の文字列ではなく、構造化して保存する。

```json
{
  "qubits": 1,
  "initial_state": {
    "format": "ket_sum_v1",
    "terms": [
      { "basis": "0", "coefficient": "alpha" },
      { "basis": "1", "coefficient": "beta" }
    ]
  },
  "cols": [["X"]],
  "variables": {
    "alpha": "0.6",
    "beta": "0.8"
  }
}
```

この形式なら、

- CLI
- feature DSL
- 将来の GUI

が同じ内部表現を共有できる。

### Feature DSL

第 1 段では既存の `Given 初期状態ベクトルは:` を拡張して扱う。

```gherkin
Given 初期状態ベクトルは:
  """
  alpha|0> + beta|1>
  """
When 次の回路を適用:
  """
      ┌───┐
  q0: ┤ X ├
      └───┘
  """
Then 状態ベクトルは:
  """
  beta|0> + alpha|1>
  """
```

## Execution Model

### Symbolic Run

`qni run --symbolic` は `initial_state` を SymPy の列ベクトルとして扱う。

- `alpha|0> + beta|1>` は `Matrix([[alpha], [beta]])`
- `X` は `Matrix([[0, 1], [1, 0]])`

として作用させ、結果を ket 和へ戻す。

未束縛変数はそのまま許可する。

```text
alpha|0> + beta|1>
  --X-->
beta|0> + alpha|1>
```

### Numeric Run

`qni run` は、`initial_state` の係数をすべて数値へ解決できたときだけ成功する。

- `alpha`, `beta` が未束縛なら失敗
- 係数が数値になっても、正規化されていなければ失敗

たとえば:

- `alpha = 0.6`, `beta = 0.8` は成功
- `alpha = 1`, `beta = 1` は正規化エラー

とする。

これにより、

- symbolic run は「式として扱う」
- numeric run は「物理状態として扱う」

という責務分離を保てる。

## Internal Design

### 1. InitialState Model

新しく `InitialState` 相当のモデルを追加する。

責務:

- ket 和の parse / validation
- JSON との相互変換
- numeric / symbolic 係数の評価
- 既定値 `|0>` の表現

第 1 段では 1 qubit 専用でもよい。

### 2. Circuit Model

`Circuit` と `CircuitFile` は `initial_state` を保持できるようにする。

- `to_h`
- `from_h`
- `attributes_from`

の経路に `initial_state` を追加する。

指定がなければ従来どおり `|0...0>` 開始とみなす。

### 3. Simulator

数値実行では、`StateVector.zero(qubits)` ではなく

- `initial_state` があればそこから `StateVector` を作る
- なければ従来どおり zero state

とする。

第 1 段は 1 qubit 限定なので、`initial_state` 付き数値実行もまずは 1 qubit のみ許可でよい。

### 4. Symbolic Renderer

[libexec/qni_symbolic_run.py](/home/yasuhito/Work/qni-cli/libexec/qni_symbolic_run.py) を拡張し、

- 初期状態ベクトルを JSON から受け取る
- `|0...0>` 固定ではなく、そのベクトルを起点に gate を適用する

ようにする。

SymPy を使う理由:

- 変数係数を自然に扱える
- gate 行列と state vector の積が素直に書ける
- `beta|0> + alpha|1>` のような整形済み出力へ戻しやすい

### 5. Variable Resolution

既存の `qni variable set` を再利用する。

- `alpha`
- `beta`

などの値は `variables` セクションに保存する。

`qni run` はそれを使って `initial_state` を数値化する。

## Validation Rules

第 1 段の validation は厳しめにする。

- basis は `|0>` と `|1>` の 2 項だけ
- 同じ basis の重複は禁止
- 数値 run では全変数が数値化可能であること
- 数値 run ではノルム 1 を満たすこと

symbolic run では正規化を強制しない。
これは `alpha`, `beta` に一般性を持たせるためであり、物理的に妥当かどうかの最終確認は numeric run 側で行う。

## Impacted Areas

- `features/*.feature`
  - state subcommand
  - symbolic run with initial state
  - numeric run with variable-resolved initial state
- `features/step_definitions/cli_steps.rb`
- `lib/qni/cli.rb`
- `lib/qni/circuit.rb`
- `lib/qni/circuit_file.rb`
- `lib/qni/simulator.rb`
- `lib/qni/state_vector.rb`
- `lib/qni/symbolic_state_renderer.rb`
- `libexec/qni_symbolic_run.py`
- 必要なら `lib/qni/initial_state*.rb` の新設

## Validation

最低限、次を通す。

- `qni state set "alpha|0> + beta|1>"` が JSON に保存される
- `qni run --symbolic` で `X` 適用後に `beta|0> + alpha|1>` を表示できる
- `qni variable set alpha 0.6`, `beta 0.8` のあと `qni run` が数値実行できる
- 未束縛変数では `qni run` が失敗する
- 非正規化では `qni run` が失敗する
- `state clear` で既定の `|0>` に戻る

## Open Notes

- 2 qubit 以上の symbolic initial state は、内部モデルを 1 qubit 専用にしすぎると広げにくくなる。JSON の `terms[basis, coefficient]` 構造は将来拡張を見据えておく。
- `α`, `β` の Unicode 入力サポートは UX として魅力があるが、内部では ASCII 変数へ正規化したほうが既存の variable 機構と整合しやすい。
- まずは `alpha|0> + beta|1>` を確実に通し、その後に `exp(i*phi)` や `sqrt(2)/2` のような一般式へ広げる順序が安全である。
