# qni Gate Operator Abstraction Design

## Problem

`Simulator#gate_class_for` は固定ゲートではクラスオブジェクトを返し、角度付きゲートではインスタンスを返している。どちらも `apply` できるので動作はするが、名前と責務が実際の抽象を表しておらず、読み手に「なぜ片方は class で片方は instance なのか」という余計な認知負荷を与えている。

## Goal

- 外部仕様を変えずに、シミュレーション内部の抽象を「`apply` を持つ演算オブジェクト」にそろえる。
- `qni add` の入力形式、`circuit.json` の保存形式、`qni run` の出力形式は維持する。
- クラス図も新しい抽象に合わせて更新する。

## Non-Goals

- `P(...)` / `Rx(...)` などの serialized gate 形式の変更
- `PhaseGate`, `RxGate`, `RyGate`, `RzGate` を mixin ベースへ作り替えること
- 固定ゲート群を新しい共通基底クラスへ統一すること
- CLI のヘルプ、引数、ユーザー向けエラーメッセージの変更

## Decisions

- `Simulator#gate_class_for` は `Simulator#gate_operator_for` に改名する。
- `StepOperation` が受け取るコールバック名も `gate_operator_for` にそろえる。
- `StateVector` 側の引数名も `gate_class` から `gate_operator` へ改める。
- 固定ゲートは引き続きクラスオブジェクトを演算オブジェクトとして扱う。
- 角度付きゲートは引き続き `AngledGate` 継承のインスタンスを演算オブジェクトとして扱う。
- `AngledGate` の継承構造は維持する。今回のリファクタは Ruby らしさの議論より、内部抽象の一貫性修正を優先する。

## Design

### Gate Operator

- シミュレータの内部では「`apply(zero_amplitude, one_amplitude)` に応答するもの」を gate operator とみなす。
- 固定単一量子ビットゲートでは既存のクラスメソッド `apply` をそのまま利用する。
- 角度付きゲートでは `AngledGates.parse` が返すインスタンスを利用する。
- これにより、実際の実装方式はクラスとインスタンスで異なっても、`Simulator`, `StepOperation`, `StateVector` から見えるインターフェースは統一される。
- `SwapGate` は `apply` を持たないため gate operator には含めず、引き続き `StepOperation#apply_swap` の専用経路で扱う。

### Naming Cleanup

- `gate_class_for` は「class を返すとは限らない」ため不正確なので、`gate_operator_for` へ改名する。
- `SingleQubitGateLayout` と `ControlledSingleQubitGateLayout` の保持フィールドも `gate_operator` にそろえる。
- `StateVector#apply_single_qubit_gate` と `StateVector#apply_controlled_single_qubit_gate` の引数名も同様にそろえる。

### Serialization Boundary

- `AddCommandOptions#serialized_gate` と `AngledGates.fetch` / `serialized` の流れはそのまま維持する。
- serialized 形式は CLI と `circuit.json` の公開境界なので、今回の変更対象から外す。
- `Simulator` はこれまで通り serialized gate を読み、固定ゲートか角度付きゲートかを解決して gate operator を返す。

### Diagram Update

- Core Model / Simulation 周辺の図では、「固定ゲート class と角度付きゲート instance の混在」を直接見せるのではなく、`Simulator` が gate operator を解決して `StepOperation` / `StateVector` がそれを使う構図に寄せる。
- `AngledGate` 継承は残す。
- 固定ゲート群は引き続き個別クラスとして表示する。

## Impacted Areas

- `lib/qni/simulator.rb`
- `lib/qni/simulator/step_operation.rb`
- `lib/qni/state_vector.rb`
- 必要なら関連コメント
- `tmp-qni-class-diagram.payload.json`

## Validation

- 既存 feature を追加変更せず、現行の `features/qni_run.feature`, `features/qni_add.feature`, `features/qni_variable.feature` が通ること。
- touched Ruby files に対する focused RuboCop を実行すること。
- 図更新後、Core Model 上で固定ゲート群と `AngledGate` 系が区別して読めることを確認すること。
