# Quantum Katas 移植候補一覧

この文書は、Microsoft Quantum Katas 由来タスクを qni-cli のベンチマーク課題へ移すための候補一覧です。ここでは課題ファイルや標準解 `.qni` は追加せず、次の issue に分けやすい単位と必要な評価基盤だけを整理します。

## 参照元

- Microsoft Quantum Katas 公式ページ: https://quantum.microsoft.com/en-us/tools/quantum-katas
- 旧 `microsoft/QuantumKatas` リポジトリ: `BasicGates/Tasks.qs` (https://github.com/microsoft/QuantumKatas/blob/main/BasicGates/Tasks.qs)
- 旧 `microsoft/QuantumKatas` リポジトリ: `Superposition/Tasks.qs` (https://github.com/microsoft/QuantumKatas/blob/main/Superposition/Tasks.qs)

公式ページは現行の Microsoft Quantum Katas 体験への入口として扱い、候補名と課題意図は旧 `Tasks.qs` の Q# タスク名とコメントで確認する。

## 分類

分類は「現行評価ランナーで追加可能」「`grading_cases` / `setup_commands` 前提」「追加 qni-cli 機能が必要」の3段階に分ける。

| 分類                                    | 意味                                                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 現行評価ランナーで追加可能              | 1つの固定された初期状態から提出物を実行し、`checks` の状態ベクトルまたは期待値で採点できる。                          |
| `grading_cases` / `setup_commands` 前提 | 同じ提出物を複数の初期状態、角度、または検証条件で採点する方が元タスクの意図に近い。                                  |
| 追加 qni-cli 機能が必要                 | `.qni` 提出物または評価ランナーだけでは、可変長入力、分岐、制御付き任意操作、再利用可能な手続きなどを自然に表せない。 |

## Single-Qubit Gates

優先候補は `State Flip`、`Basis Change`、`Sign Flip`、`Phase Shift Gates`、`Amplitude Change` とする。

| 候補                | 旧 `Tasks.qs` の名前       | 分類                                    | `grading_cases` / `setup_commands`                                       | 追加 qni-cli 機能 | 備考                                                                                     |
| ------------------- | -------------------------- | --------------------------------------- | ------------------------------------------------------------------------ | ----------------- | ---------------------------------------------------------------------------------------- |
| `State Flip`        | `StateFlip`                | `grading_cases` / `setup_commands` 前提 | `\|0>`、`\|1>`、実数・複素重ね合わせの4入力を厳密比較する。              | 不要              | `basic-gates/state-flip` は採点強化済み。                                                |
| `Basis Change`      | `BasisChange`              | `grading_cases` / `setup_commands` 前提 | `\|0>` から `\|+>`、`\|1>` から `\|->`、一般状態の写像を分けて採点する。 | 不要              | `H` だけで解けるが、1ケースだけでは基底変換の意図が弱い。                                |
| `Sign Flip`         | `SignFlip`                 | `grading_cases` / `setup_commands` 前提 | `\|+>` と `\|->`、または `α\|0> + β\|1>` を使う複数ケースが必要。        | 不要              | `Z` による `\|1>` 成分の符号反転を確認する。                                             |
| `Phase Shift Gates` | `PhaseFlip`, `PhaseChange` | `grading_cases` / `setup_commands` 前提 | `S` 相当の固定位相と、角度付き位相を複数角度で採点する。                 | 不要              | 公式ページのレッスン名に合わせ、旧タスクでは `PhaseFlip` と `PhaseChange` に対応させる。 |
| `Amplitude Change`  | `AmplitudeChange`          | `grading_cases` / `setup_commands` 前提 | 複数の角度と `\|0>` / `\|1>` の写像を分けて採点する。                    | 原則不要          | 記号角そのものを採点したい場合は、別 issue で角度式の扱いを確認する。                    |

## Preparing Quantum States

優先候補は `Plus State`、`Minus State`、`All Two-Qubit Basis Vectors`、`Bell State`、`GHZ State`、`W State` とする。

| 候補                          | 旧 `Tasks.qs` の名前                    | 分類                                    | `grading_cases` / `setup_commands`                                | 追加 qni-cli 機能                   | 備考                                                                             |
| ----------------------------- | --------------------------------------- | --------------------------------------- | ----------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------- |
| `Plus State`                  | `PlusState`                             | 現行評価ランナーで追加可能              | 不要                                                              | 不要                                | `superposition/plus-state` はスモーク課題として追加済み。                        |
| `Minus State`                 | `MinusState`                            | 現行評価ランナーで追加可能              | 不要                                                              | 不要                                | `superposition/minus-state` はスモーク課題として追加済み。                       |
| `All Two-Qubit Basis Vectors` | `AllBasisVectors_TwoQubits`             | 現行評価ランナーで追加可能              | 不要                                                              | 不要                                | `superposition/all-basis-vectors-two-qubits` はスモーク課題として追加済み。      |
| `Bell State`                  | `BellState`                             | 現行評価ランナーで追加可能              | 不要                                                              | 不要                                | `superposition/bell-state` はスモーク課題として追加済み。                        |
| `All Bell States`             | `AllBellStates`                         | `grading_cases` / `setup_commands` 前提 | 4つの Bell 状態を別ケースまたは別課題に分ける。                   | `index` 付き1課題として扱うなら必要 | 最初は4つの固定課題に分ける方が qni-cli の提出形式に合う。                       |
| `GHZ State`                   | `GHZ_State`                             | 現行評価ランナーで追加可能              | 固定した N ごとの課題なら不要。複数 N を1課題にまとめるなら必要。 | 一般 N の1課題化には必要            | まず N = 3 の固定課題として切ると小さい。                                        |
| `W State`                     | `WState_PowerOfTwo`, `WState_Arbitrary` | 追加 qni-cli 機能が必要                 | 固定 N の検証ケースは作れるが、元タスクの可変長性は表しにくい。   | 必要                                | 制御付き回転、可変長の回路生成、または手続き的な提出形式を検討してから移植する。 |

## 次に切り出しやすい issue

1. `Basis Change`、`Sign Flip`、`Phase Shift Gates`、`Amplitude Change` を `grading_cases` / `setup_commands` 前提の小さなベンチマーク課題として追加する。
2. `All Bell States` を4つの固定 Bell 状態課題へ分けて追加する。
3. `GHZ State` を N = 3 の固定課題として追加し、一般 N 化は別 issue に分ける。
4. `W State` は qni-cli の追加機能を先に設計してから課題化する。

## 新 Kata 57問の対応表

上流は [microsoft/qsharp の katas/content](https://github.com/microsoft/qsharp/tree/7c6a2b51/katas/content)（調査基準コミット `7c6a2b51`、MIT License）。各 `index.md` の exercise ID と照合した。課題文は日本語で書き直し、Q#コードは複製しない。既存IDは変更しない。

固定値は各PRで決定し、この対応表に記録する。「未決定」は実装前の選定事項であり、既定値ではない。移植済み数は部分的な移植を含む。既存の範囲外3問（bell-state-change-1..3）は57問に含まない。

| Kata                     | 総数 | 移植済み | 部分的（内数） | 残り |
| ------------------------ | ---: | -------: | -------------: | ---: |
| Single-Qubit Gates       |   14 |       14 |              4 |    0 |
| Multi-Qubit Gates        |   10 |       10 |              3 |    0 |
| Preparing Quantum States |   21 |       14 |              4 |    7 |
| QFT                      |   12 |        0 |              0 |   12 |
| 合計                     |   57 |       38 |             11 |   19 |

### 必要な機能と採点方針

- F1: グローバル位相を無視する状態比較。既存状態準備7問にも適用し、そのPR本文で過去の評価との差を明記する。保存済み研究試行は再採点しない。
- F2: 参照回路との等価性採点（厳密比較とグローバル位相を無視する比較）。
- F3: 採点ケースごとの角度変数（任意の追加機能）。
- F4: 中立JSON語彙に回転ゲート、制御付き回転、多重制御を追加。
- F5: 測定結果の採点。signal_frequency は逆QFTによる状態準備へ置き換える方針なのでF2を使う。

初回5問は厳密比較で |0>、|1>、|+> を検証する。prepare_minus の上流はゼロ入力のみの厳密比較だが、ここでは X→H の変換全体を指定して3入力で採点する。Preparing の既存7問はF1適用前。state-flip、fredkin-gate、global-phase-change は独立した変更で採点を強化済み（下記）。

追跡: [#441](https://github.com/yasuhito/qni-cli/issues/441)。PR順序: 初回5問 → F1 → F4 → Single残り → Multi残り → PreparingのF4不要分 → F4必要分 → F2 → QFT前半 → QFT後半。採点強化は独立PR。

### 既存3課題の採点強化

課題IDは維持し、グローバル位相も含めた厳密比較を使う。

- `basic-gates/state-flip`: 1入力から4入力へ。全2基底と実数・複素重ね合わせで X の変換を検証する。Z→X（-iY）、X→Z、Y を誤答として検証する。
- `basic-gates/fredkin-gate`: 2入力から10入力へ。全8基底の振幅を厳密比較するため、上流の `CheckOperationsAreEqualStrict(3, ...)` と同じユニタリ変換を要求する。制御の重ね合わせと複素位相も検証する。
- `basic-gates/global-phase-change`: 2入力から7入力へ。既存の制御付き2量子ビット課題は維持し、全4基底と対象・制御の重ね合わせを検証する。上流の1量子ビット `-I` そのものとは異なり、その制御付き版を採点する。`available_gates` に CNOT/CZ を追加し、上流の Z→X→Z→X を制御付き Pauli ゲートで構成できるようにした。既存の ControlledGlobalPhase と標準解も維持する。

旧条件で PASS した誤答が FAIL になるほか、GlobalPhaseChange の提出可能なゲートも増える。過去の評価と条件が異なるため、点数を直接比較しない。保存済み `research/runs/*` は [ADR 0019](../adr/0019-research-report-does-not-regrade.md) に従って再採点しない。

### single_qubit_gates

| 上流 exercise ID                              | qni課題ID（未移植は予定）                    | 状態                     | 必要な機能                   | 固定値                                              |
| --------------------------------------------- | -------------------------------------------- | ------------------------ | ---------------------------- | --------------------------------------------------- |
| `single_qubit_gates__state_flip`              | `basic-gates/state-flip`                     | 移植済み（採点強化済み） | なし                         | N=1、全2基底と重ね合わせの厳密比較                  |
| `single_qubit_gates__sign_flip`               | `basic-gates/sign-flip`                      | 移植済み                 | なし                         | パラメータなし                                      |
| `single_qubit_gates__y_gate`                  | `single-qubit-gates/y-gate`                  | 移植済み                 | なし                         | パラメータなし                                      |
| `single_qubit_gates__sign_flip_on_zero`       | `single-qubit-gates/sign-flip-on-zero`       | 移植済み                 | なし                         | パラメータなし                                      |
| `single_qubit_gates__global_phase_minusone`   | `basic-gates/global-phase-change`            | 移植済み（採点強化済み） | なし                         | N=2、制御付き -I（上流から拡張）、全4基底の厳密比較 |
| `single_qubit_gates__global_phase_i`          | `single-qubit-gates/global-phase-i`          | 移植済み                 | なし                         | パラメータなし                                      |
| `single_qubit_gates__basis_change`            | `basic-gates/basis-change`                   | 移植済み                 | なし                         | パラメータなし                                      |
| `single_qubit_gates__prepare_minus`           | `single-qubit-gates/prepare-minus`           | 移植済み                 | なし                         | N=1、X→H変換（上流より入力条件を追加）              |
| `single_qubit_gates__phase_i`                 | `basic-gates/phase-flip`                     | 移植済み                 | なし                         | パラメータなし                                      |
| `single_qubit_gates__three_quarters_pi_phase` | `single-qubit-gates/three-quarters-pi-phase` | 移植済み                 | なし                         | 角度=3π/4                                           |
| `single_qubit_gates__complex_phase`           | `basic-gates/phase-change-pi-over-3`         | 部分的                   | F3または固定インスタンス追加 | α=π/3                                               |
| `single_qubit_gates__amplitude_change`        | `single-qubit-gates/amplitude-change`        | 部分的                   | F4 (Ry)、一般角度はF3        | α=π/6                                               |
| `single_qubit_gates__prepare_rotated_state`   | `single-qubit-gates/prepare-rotated-state`   | 部分的                   | F4 (Rx)、一般値はF3          | α=-√3/2, β=1/2                                      |
| `single_qubit_gates__prepare_arbitrary_state` | `single-qubit-gates/prepare-arbitrary-state` | 部分的                   | F4 (Ry)、一般値はF3          | α=1/2, β=√3/2, θ=π/3                                |

残り3問は固定インスタンスとして追加済み（一般引数の対応は未実装なので「部分的」）。上流 `Verification.qs` は3問とも Strict 比較であり、グローバル位相を無視しない。AmplitudeChange は Ry(π/3) の変換を |0>、|1>、|+> で検証する。PrepareRotatedState は Rx(5π/3)、PrepareArbitraryState は Ry(2π/3)→P(π/3) で、上流と同じゼロ入力のみを検証する。

### multi_qubit_gates

| 上流 exercise ID                             | qni課題ID（未移植は予定）                | 状態                     | 必要な機能                | 固定値                                                                                               |
| -------------------------------------------- | ---------------------------------------- | ------------------------ | ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `multi_qubit_gates__compound_gate`           | `multi-qubit-gates/compound-gate`        | 移植済み                 | なし                      | N=3、パラメータなし、全8基底と複素重ね合わせの厳密比較                                               |
| `multi_qubit_gates__entangle_qubits`         | `basic-gates/two-qubit-gate-1`           | 移植済み                 | なし                      | パラメータなし                                                                                       |
| `multi_qubit_gates__preparing_bell_state`    | `multi-qubit-gates/preparing-bell-state` | 移植済み                 | F1                        | N=2、パラメータなし、ゼロ入力のみ                                                                    |
| `multi_qubit_gates__relative_phase_minusone` | `basic-gates/two-qubit-gate-2`           | 移植済み                 | なし                      | パラメータなし                                                                                       |
| `multi_qubit_gates__qubit_swap`              | `basic-gates/two-qubit-gate-3`           | 部分的                   | 固定インスタンス追加      | N=2, index1=0, index2=1                                                                              |
| `multi_qubit_gates__fredkin_gate`            | `basic-gates/fredkin-gate`               | 移植済み（採点強化済み） | なし                      | N=3、全8基底と重ね合わせの厳密比較                                                                   |
| `multi_qubit_gates__controlled_rotation`     | `multi-qubit-gates/controlled-rotation`  | 部分的                   | F1/F4 (CRx)、一般角度はF3 | N=2、θ=π/3、制御0・対象1、全4基底と複素重ね合わせ                                                    |
| `multi_qubit_gates__toffoli_gate`            | `basic-gates/toffoli-gate`               | 移植済み                 | なし                      | パラメータなし                                                                                       |
| `multi_qubit_gates__anti_controlled_gate`    | `basic-gates/two-qubit-gate-4`           | 移植済み                 | なし                      | パラメータなし                                                                                       |
| `multi_qubit_gates__arbitrary_controls`      | `multi-qubit-gates/arbitrary-controls`   | 部分的                   | F1/F4 (MCX)               | N=4（制御数、全体5）、controlBits=[true,false,true,false]、制御0..3・対象4、全32基底と複素重ね合わせ |

CompoundGate は上流の `CheckOperationsAreEqualStrict` に合わせて厳密比較する。残3問のみ `up_to_global_phase` を使う。ControlledRotation と ArbitraryControls は基底入力に加えて全基底に非ゼロ振幅を持つ複素重ね合わせを採点し、入力ごとに異なる位相を付ける誤答を防ぐ。上流の複数角度・全制御パターンは固定インスタンスへ縮小するため部分的移植として数える。

### preparing_states

| 上流 exercise ID                                       | qni課題ID（未移植は予定）                                   | 状態     | 必要な機能                | 固定値                  |
| ------------------------------------------------------ | ----------------------------------------------------------- | -------- | ------------------------- | ----------------------- |
| `preparing_states__plus_state`                         | `superposition/plus-state`                                  | 移植済み | F1（既存7問にも適用予定） | パラメータなし          |
| `preparing_states__minus_state`                        | `superposition/minus-state`                                 | 移植済み | F1（既存7問にも適用予定） | パラメータなし          |
| `preparing_states__even_sup_two_qubits`                | `superposition/all-basis-vectors-two-qubits`                | 移植済み | F1（既存7問にも適用予定） | N=2（上流も固定）       |
| `preparing_states__even_sup_two_qubits_phase_flip`     | `superposition/all-basis-vector-with-phase-flip-two-qubits` | 移植済み | F1（既存7問にも適用予定） | N=2（上流も固定）       |
| `preparing_states__even_sup_two_qubits_complex_phases` | `superposition/all-basis-vectors-with-phases-two-qubits`    | 移植済み | F1（既存7問にも適用予定） | N=2（上流も固定）       |
| `preparing_states__bell_state`                         | `superposition/bell-state`                                  | 移植済み | F1（既存7問にも適用予定） | パラメータなし          |
| `preparing_states__all_bell_states`                    | `preparing-states/all-bell-states`                          | 未移植   | F1                        | 未決定: 4状態に分割予定 |
| `preparing_states__ghz_state`                          | `superposition/ghz-state`                                   | 部分的   | F1、固定インスタンス追加  | N=3                     |
| `preparing_states__all_basis_vectors`                  | `preparing-states/all-basis-vectors`                        | 未移植   | F1                        | 未決定: N               |
| `preparing_states__even_odd`                           | `preparing-states/even-odd`                                 | 未移植   | F1                        | 未決定: N, isEven       |
| `preparing_states__zero_and_bitstring`                 | `preparing-states/zero-and-bitstring`                       | 未移植   | F1                        | 未決定: bits            |
| `preparing_states__two_bitstrings`                     | `preparing-states/two-bitstrings`                           | 未移植   | F1                        | 未決定: bits1, bits2    |
| `preparing_states__four_bitstrings`                    | `preparing-states/four-bitstrings`                          | 未移植   | F1/F4                     | 未決定: 4つのbits       |
| `preparing_states__parity_bitstrings`                  | `preparing-states/parity-bitstrings`                        | 未移植   | F1                        | 未決定: N, parity       |
| `preparing_states__unequal_superposition`              | `preparing-states/unequal-superposition`                    | 部分的   | F1/F4 (Ry)                | N=1、α=π/6              |
| `preparing_states__controlled_rotation`                | `preparing-states/controlled-rotation`                      | 移植済み | F1/F4 (CH)                | N=2（上流も固定）       |
| `preparing_states__three_states_two_qubits`            | `preparing-states/three-states-two-qubits`                  | 移植済み | F1/F4 (Ry/CH)             | N=2（上流も固定）       |
| `preparing_states__three_states_two_qubits_phases`     | `preparing-states/three-states-two-qubits-phases`           | 移植済み | F1/F4 (Ry/CH/P)           | N=2、位相=2π/3,4π/3     |
| `preparing_states__hardy_state`                        | `preparing-states/hardy-state`                              | 移植済み | F1/F4 (Ry/CRy)            | N=2（上流も固定）       |
| `preparing_states__wstate_power_of_two`                | `preparing-states/wstate-power-of-two`                      | 部分的   | F1/F4 (CRy)               | N=4                     |
| `preparing_states__wstate_arbitrary`                   | `preparing-states/wstate-arbitrary`                         | 部分的   | F1/F4 (CRy)               | N=3                     |

回転を使う7課題は上流と同じゼロ入力・非Strict比較で採点する。UnequalSuperposition の α と WState の N は固定するため部分的移植とする。ThreeStates の相対位相は 2π/3,4π/3、Hardy の振幅は (3,1,1,1)/sqrt(12) を維持する。WState は制御付き Ry と CNOT で励起を隣へ分配する固定長回路で、測定・補助量子ビット・多重制御回転を必要としない。一般の引数や可変長回路生成は対象外。

### qft

| 上流 exercise ID                 | qni課題ID（未移植は予定）       | 状態   | 必要な機能 | 固定値         |
| -------------------------------- | ------------------------------- | ------ | ---------- | -------------- |
| `qft__single_qubit`              | `qft/single-qubit`              | 未移植 | なし       | パラメータなし |
| `qft__rotation_gate`             | `qft/rotation-gate`             | 未移植 | なし       | 未決定: k      |
| `qft__binary_fraction_classical` | `qft/binary-fraction-classical` | 未移植 | なし       | 未決定: j      |
| `qft__binary_fraction_quantum`   | `qft/binary-fraction-quantum`   | 未移植 | F2         | 未決定: n      |
| `qft__binary_fraction_inplace`   | `qft/binary-fraction-inplace`   | 未移植 | F2         | 未決定: n      |
| `qft__qft`                       | `qft/qft`                       | 未移植 | F2         | 未決定: n      |
| `qft__all_basis_vectors`         | `qft/all-basis-vectors`         | 未移植 | F1         | 未決定: n      |
| `qft__periodic_state`            | `qft/periodic-state`            | 未移植 | F1         | 未決定: n, F   |
| `qft__alternating_amplitudes`    | `qft/alternating-amplitudes`    | 未移植 | F1         | 未決定: n      |
| `qft__all_even_vectors`          | `qft/all-even-vectors`          | 未移植 | F1         | 未決定: n      |
| `qft__square_wave`               | `qft/square-wave`               | 未移植 | F1         | 未決定: n      |
| `qft__signal_frequency`          | `qft/signal-frequency`          | 未移植 | F2         | 未決定: n, F   |
