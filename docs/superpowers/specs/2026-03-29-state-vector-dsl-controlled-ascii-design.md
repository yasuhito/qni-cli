# State Vector DSL Controlled ASCII Design

## Problem

`features/katas/basic_gates/state_flip.feature` の先頭 4 scenario は、`初期状態ベクトルは:` / `次の回路を適用:` / `状態ベクトルは:` の高レベル DSL で読めるようになった。一方、最後の controlled 検証 scenario はまだ `qni add ...` と `qni expect ZI` の列挙に依存していて、feature 全体の読み味がそろっていない。

さらに、現在の `AsciiCircuitParser` は 1 qubit の固定ゲート box しか読めない。`state_flip.feature` の controlled scenario を高レベル DSL に寄せるには、少なくとも 2 qubit の fixed gate / control / swap を含む ASCII 回路を読める必要がある。

ただし、現在の `qni view` は `Ry` の角度を表示しない。したがって「いまの表示をそのまま逆変換する」だけでは `Ry(1.8545904360032246)` のような回路は復元できない。

## Goal

- `state_flip.feature` の controlled 検証 scenario を、ほかの scenario と同じ state-vector DSL にそろえる。
- `Given 初期状態ベクトルは:` を 2 qubit の必要状態まで広げる。
- `When 次の回路を適用:` が 2 qubit の controlled ASCII 回路を読めるようにする。
- ASCII DSL は `qni view` 互換を基本にしつつ、角度付きゲートだけは parser 拡張表記を許す。

## Non-Goals

- `qni view` の表示仕様を変更して角度を常時表示すること
- 任意の qubit 数、任意の gate、任意の交差配線を一度に parser 対応すること
- `state_flip.feature` 以外の kata feature を同時に全面書き換えすること
- symbolic renderer や simulator 本体の数値計算ロジックを変更すること

## Decisions

- controlled scenario の理想形は、「初期 2 qubit 状態に回路を適用した結果、同じ状態へ戻る」として書く。
- この scenario では `Ry(1.8545904360032246)` を ASCII に埋め込まない。代わりに、初期状態を `0.6|00> + 0.8|01>` として直接与える。
- ASCII parser は、`qni view` がそのまま出す固定ゲート・control・swap をまず読めるようにする。
- 角度付きゲートは round-trip 互換ではなく「DSL 拡張」として `Ry(π/2)` のような表記を追加で受け入れる。
- `Ry` のように角度が省略された表示は、parser では復元不能なため fixed gate と同列には扱わない。

## Ideal Scenario

```gherkin
Scenario: controlled な X 検証回路は control qubit を |0> に戻す
  Given 初期状態ベクトルは:
    """
    0.6|00> + 0.8|01>
    """
  When 次の回路を適用:
    """
        ┌───┐           ┌───┐
    q0: ┤ H ├──■────■──┤ H ├
        └───┘┌─┴─┐┌─┴─┐└───┘
    q1: ─────┤ X ├┤ X ├─────
             └───┘└───┘
    """
  Then 状態ベクトルは:
    """
    0.6|00> + 0.8|01>
    """
```

この scenario は、元の `qni expect ZI` 検証よりユーザーの意図が直接読める。`control qubit を |0> に戻す` という意味を、最終状態ベクトルが入力状態と一致することで高レベルに表せる。

## Design

### State Vector DSL

- `Given 初期状態ベクトルは:` は 1 qubit に加えて 2 qubit の必要状態を受け付ける。
- 最低限サポートする文字列は `|00>`, `|01>`, `|10>`, `|11>`, `0.6|00> + 0.8|01>` とする。
- 実装は既存の `1 qubit の初期状態が ...` / `2 qubit の初期状態が ...` と同じく、「その状態を準備する列を `circuit.json` へ直接書く」方式を保つ。
- `Then 状態ベクトルは:` は引き続き `qni run --symbolic` を内部実行して比較する。

### ASCII Parser Scope

- 対応対象は 2 qubit までとする。
- 対応する要素は次の 4 つとする。
  - 空 wire
  - fixed single-qubit gate box
  - control + target からなる controlled single-qubit gate
  - swap
- fixed gate は `H`, `X`, `Y`, `Z`, `S`, `S†`, `T`, `T†`, `√X` を維持する。
- 2 qubit 対応では、上下 2 本の wire を step ごとにまとめて読み、1 step ごとの記号配置から `Circuit` へ反映する。

### Controlled Gate Parsing

- `qni view` と同じ見た目を基本入力とする。
- control は `■`、target は boxed gate、間の縦配線は `│` / `┴` / `┬` の組み合わせとして読む。
- parser は 1 step の中で「control が 1 個、target が 1 個」の形をまずサポートする。
- `state_flip.feature` で必要なのは `■` + `X` の CNOT なので、最初の実装は controlled `X` を確実に通すことを優先する。
- その後の設計余地として、target box 側のラベルを fixed gate 一般へ広げられる構造にする。

### Angled Gate Extension

- `qni view` 互換入力では `Ry` の角度が失われるため、parser だけの拡張入力として `Ry(π/2)` のような表記を許す。
- 許可する記法は既存の `AngleExpression` が読める範囲に合わせる。
- 例:
  - `P(π/3)`
  - `Rx(-π/4)`
  - `Ry(theta)`
  - `Rz(2*alpha)`
- 角度付き gate は「ASCII parser が理解する DSL 拡張」であり、現時点では `qni view` の round-trip 互換ではないことを明記する。

### Parser Architecture

- 現在の `AsciiCircuitParser` は 1 本の qubit line を固定幅 5 文字セルへ分割している。
- 2 qubit 対応では、単純に `qubit line を増やす` だけでなく、「同じ step に属する複数 wire のセル集合」をまとめて解釈する必要がある。
- そのため、内部責務は次のように分ける。
  - 複数 wire の 3 行セットを step 単位へ分割する責務
  - 1 step の複数 qubit セルから placement を判定する責務
  - placement を `Circuit#add_gate`, `#add_controlled_gate`, `#add_swap_gate` へ反映する責務
- `state_flip.feature` では 5 文字幅の固定 gate と control bridge が中心なので、最初の 2 qubit 対応でも fixed-width 基盤は維持してよい。
- ただし `Ry(π/2)` などの angled gate 拡張では可変幅 box が必要になるため、`cell width = 5` の前提は「fixed gate path のみ」で閉じるように整理する。

## Impacted Areas

- `features/katas/basic_gates/state_flip.feature`
- `features/ascii_circuit_parser.feature`
- `features/step_definitions/cli_steps.rb`
- `test/qni/view/ascii_circuit_parser_test.rb`
- `lib/qni/view/ascii_circuit_parser.rb`
- 必要なら `lib/qni/view/ascii_step_cell.rb`, `lib/qni/view/ascii_step_rows.rb` の責務分割見直し

## Validation

- `state_flip.feature` の controlled scenario が新 DSL で通ること
- `features/ascii_circuit_parser.feature` に 2 qubit controlled ASCII を読む scenario を追加すること
- `test/qni/view/ascii_circuit_parser_test.rb` に 2 qubit controlled gate と、将来の angled gate 拡張の最小ケースを追加すること
- touched files への focused RuboCop / Reek を通すこと
- 最後に `bundle exec rake check` を通すこと

## Open Notes

- `state_flip.feature` の controlled scenario を高レベル化する目的では、angled gate parser 拡張は必須ではない。必須なのは 2 qubit initial state と controlled ASCII parsing である。
- それでも angled gate 拡張の設計を spec に含めるのは、今後 `Ry(π/2)` などを feature へ自然に書けるようにするためである。
- 実装は、まず controlled scenario を通す最小差分を優先し、その後に angled gate DSL を追加する順序が安全である。
