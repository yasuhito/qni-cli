# Feature: qni benchmark run

qni-cli の利用者として
課題ファイルと `.qni` 提出物を同じ条件で評価するために
qni benchmark run で最小の合格判定を実行したい。

## Scenario: StateFlip 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni" を実行
- Then コマンドは成功

## Scenario: StateFlip 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS StateFlip
  ```

## Scenario: StateFlip 評価は作業ディレクトリに circuit.json を残さない

- Given "circuit.json" は存在しない
- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni" を実行
- Then "circuit.json" は存在しない

## Scenario: StateFlip 標準解の JSON は passed を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "status": "passed"
  ```

## Scenario: StateFlip 標準解の JSON は終了コード 0 を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "exitCode": 0
  ```

## Scenario: StateFlip 標準解の JSON は機械処理できる結果である

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "taskId": "basic-gates/state-flip",
    "title": "StateFlip",
    "submission": "benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni",
    "status": "passed",
    "exitCode": 0,
    "checks": [
      {
        "type": "run",
        "status": "passed"
      }
    ]
  }
  ```

## Scenario: PlusState 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/superposition/plus-state.md benchmarks/solutions/quantum-katas/superposition/plus-state.qni" を実行
- Then コマンドは成功

## Scenario: PlusState 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/superposition/plus-state.md benchmarks/solutions/quantum-katas/superposition/plus-state.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS PlusState
  ```

## Scenario: BasisChange 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/basic-gates/basis-change.md" は存在する

## Scenario: BasisChange 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/basic-gates/basis-change.qni" は存在する

## Scenario: BasisChange 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/basis-change.md benchmarks/solutions/quantum-katas/basic-gates/basis-change.qni" を実行
- Then コマンドは成功

## Scenario: BasisChange 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/basis-change.md benchmarks/solutions/quantum-katas/basic-gates/basis-change.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS BasisChange
  ```

## Scenario: BellStateChange1 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/basic-gates/bell-state-change-1.md" は存在する

## Scenario: BellStateChange1 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-1.qni" は存在する

## Scenario: BellStateChange1 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/bell-state-change-1.md benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-1.qni" を実行
- Then コマンドは成功

## Scenario: BellStateChange1 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/bell-state-change-1.md benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-1.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS BellStateChange1
  ```

## Scenario: BellStateChange2 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/basic-gates/bell-state-change-2.md" は存在する

## Scenario: BellStateChange2 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-2.qni" は存在する

## Scenario: BellStateChange2 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/bell-state-change-2.md benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-2.qni" を実行
- Then コマンドは成功

## Scenario: BellStateChange2 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/bell-state-change-2.md benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-2.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS BellStateChange2
  ```

## Scenario: BellStateChange3 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/basic-gates/bell-state-change-3.md" は存在する

## Scenario: BellStateChange3 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-3.qni" は存在する

## Scenario: BellStateChange3 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/bell-state-change-3.md benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-3.qni" を実行
- Then コマンドは成功

## Scenario: BellStateChange3 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/bell-state-change-3.md benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-3.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS BellStateChange3
  ```

## Scenario: FredkinGate 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/basic-gates/fredkin-gate.md" は存在する

## Scenario: FredkinGate 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/basic-gates/fredkin-gate.qni" は存在する

## Scenario: FredkinGate 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/fredkin-gate.md benchmarks/solutions/quantum-katas/basic-gates/fredkin-gate.qni" を実行
- Then コマンドは成功

## Scenario: FredkinGate 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/fredkin-gate.md benchmarks/solutions/quantum-katas/basic-gates/fredkin-gate.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS FredkinGate
  ```

## Scenario: GlobalPhaseChange 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/basic-gates/global-phase-change.md" は存在する

## Scenario: GlobalPhaseChange 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/basic-gates/global-phase-change.qni" は存在する

## Scenario: GlobalPhaseChange 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/global-phase-change.md benchmarks/solutions/quantum-katas/basic-gates/global-phase-change.qni" を実行
- Then コマンドは成功

## Scenario: GlobalPhaseChange 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/global-phase-change.md benchmarks/solutions/quantum-katas/basic-gates/global-phase-change.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS GlobalPhaseChange
  ```

## Scenario: SignFlip 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/basic-gates/sign-flip.md" は存在する

## Scenario: SignFlip 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/basic-gates/sign-flip.qni" は存在する

## Scenario: SignFlip 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/sign-flip.md benchmarks/solutions/quantum-katas/basic-gates/sign-flip.qni" を実行
- Then コマンドは成功

## Scenario: SignFlip 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/sign-flip.md benchmarks/solutions/quantum-katas/basic-gates/sign-flip.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS SignFlip
  ```

## Scenario: PhaseFlip 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/basic-gates/phase-flip.md" は存在する

## Scenario: PhaseFlip 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/basic-gates/phase-flip.qni" は存在する

## Scenario: PhaseFlip 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/phase-flip.md benchmarks/solutions/quantum-katas/basic-gates/phase-flip.qni" を実行
- Then コマンドは成功

## Scenario: PhaseFlip 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/phase-flip.md benchmarks/solutions/quantum-katas/basic-gates/phase-flip.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS PhaseFlip
  ```

## Scenario: PhaseChangePiOver3 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/basic-gates/phase-change-pi-over-3.md" は存在する

## Scenario: PhaseChangePiOver3 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/basic-gates/phase-change-pi-over-3.qni" は存在する

## Scenario: PhaseChangePiOver3 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/phase-change-pi-over-3.md benchmarks/solutions/quantum-katas/basic-gates/phase-change-pi-over-3.qni" を実行
- Then コマンドは成功

## Scenario: PhaseChangePiOver3 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/phase-change-pi-over-3.md benchmarks/solutions/quantum-katas/basic-gates/phase-change-pi-over-3.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS PhaseChangePiOver3
  ```

## Scenario: MinusState 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/superposition/minus-state.md" は存在する

## Scenario: MinusState 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/superposition/minus-state.qni" は存在する

## Scenario: MinusState 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/superposition/minus-state.md benchmarks/solutions/quantum-katas/superposition/minus-state.qni" を実行
- Then コマンドは成功

## Scenario: MinusState 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/superposition/minus-state.md benchmarks/solutions/quantum-katas/superposition/minus-state.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS MinusState
  ```

## Scenario: AllBasisVectors_TwoQubits 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/superposition/all-basis-vectors-two-qubits.md" は存在する

## Scenario: AllBasisVectors_TwoQubits 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/superposition/all-basis-vectors-two-qubits.qni" は存在する

## Scenario: AllBasisVectors_TwoQubits 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/superposition/all-basis-vectors-two-qubits.md benchmarks/solutions/quantum-katas/superposition/all-basis-vectors-two-qubits.qni" を実行
- Then コマンドは成功

## Scenario: AllBasisVectors_TwoQubits 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/superposition/all-basis-vectors-two-qubits.md benchmarks/solutions/quantum-katas/superposition/all-basis-vectors-two-qubits.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS AllBasisVectors_TwoQubits
  ```

## Scenario: BellState 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/superposition/bell-state.md" は存在する

## Scenario: BellState 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/superposition/bell-state.qni" は存在する

## Scenario: BellState 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/superposition/bell-state.md benchmarks/solutions/quantum-katas/superposition/bell-state.qni" を実行
- Then コマンドは成功

## Scenario: BellState 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/superposition/bell-state.md benchmarks/solutions/quantum-katas/superposition/bell-state.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS BellState
  ```

## Scenario: BellState 標準解の JSON は expect 検証を含む

- When "qni benchmark run benchmarks/quantum-katas/superposition/bell-state.md benchmarks/solutions/quantum-katas/superposition/bell-state.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "type": "expect"
  ```

## Scenario: AllBasisVectorWithPhaseFlip_TwoQubits 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/superposition/all-basis-vector-with-phase-flip-two-qubits.md" は存在する

## Scenario: AllBasisVectorWithPhaseFlip_TwoQubits 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/superposition/all-basis-vector-with-phase-flip-two-qubits.qni" は存在する

## Scenario: AllBasisVectorWithPhaseFlip_TwoQubits 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/superposition/all-basis-vector-with-phase-flip-two-qubits.md benchmarks/solutions/quantum-katas/superposition/all-basis-vector-with-phase-flip-two-qubits.qni" を実行
- Then コマンドは成功

## Scenario: AllBasisVectorWithPhaseFlip_TwoQubits 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/superposition/all-basis-vector-with-phase-flip-two-qubits.md benchmarks/solutions/quantum-katas/superposition/all-basis-vector-with-phase-flip-two-qubits.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS AllBasisVectorWithPhaseFlip_TwoQubits
  ```

## Scenario: AllBasisVectorsWithPhases_TwoQubits 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/superposition/all-basis-vectors-with-phases-two-qubits.md" は存在する

## Scenario: AllBasisVectorsWithPhases_TwoQubits 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/superposition/all-basis-vectors-with-phases-two-qubits.qni" は存在する

## Scenario: AllBasisVectorsWithPhases_TwoQubits 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/superposition/all-basis-vectors-with-phases-two-qubits.md benchmarks/solutions/quantum-katas/superposition/all-basis-vectors-with-phases-two-qubits.qni" を実行
- Then コマンドは成功

## Scenario: AllBasisVectorsWithPhases_TwoQubits 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/superposition/all-basis-vectors-with-phases-two-qubits.md benchmarks/solutions/quantum-katas/superposition/all-basis-vectors-with-phases-two-qubits.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS AllBasisVectorsWithPhases_TwoQubits
  ```

## Scenario: GHZState 課題ファイルがある

- Then リポジトリファイル "benchmarks/quantum-katas/superposition/ghz-state.md" は存在する

## Scenario: GHZState 標準解がある

- Then リポジトリファイル "benchmarks/solutions/quantum-katas/superposition/ghz-state.qni" は存在する

## Scenario: GHZState 標準解は合格する

- When "qni benchmark run benchmarks/quantum-katas/superposition/ghz-state.md benchmarks/solutions/quantum-katas/superposition/ghz-state.qni" を実行
- Then コマンドは成功

## Scenario: GHZState 標準解の合格が表示される

- When "qni benchmark run benchmarks/quantum-katas/superposition/ghz-state.md benchmarks/solutions/quantum-katas/superposition/ghz-state.qni" を実行
- Then 標準出力に次を含む:

  ```text
  PASS GHZState
  ```

## Scenario: GHZState 標準解の JSON は run 検証を含む

- When "qni benchmark run benchmarks/quantum-katas/superposition/ghz-state.md benchmarks/solutions/quantum-katas/superposition/ghz-state.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "type": "run"
  ```

## Scenario: StateFlip の不許可サンプルがある

- Then リポジトリファイル "benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni" は存在する

## Scenario: StateFlip の不許可コマンドは終了コード 2 になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni" を実行
- Then 終了コードは 2

## Scenario: StateFlip の不許可コマンドは拒否された行を表示する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni" を実行
- Then 標準出力に次を含む:

  ```text
  DISALLOWED StateFlip
  rejected: line 1: qni run
  ```

## Scenario: StateFlip の不許可コマンドの JSON は disallowed を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "status": "disallowed"
  ```

## Scenario: StateFlip の不許可コマンドの JSON は終了コード 2 を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "exitCode": 2
  ```

## Scenario: StateFlip の不許可コマンドの JSON は機械処理できる結果である

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "taskId": "basic-gates/state-flip",
    "title": "StateFlip",
    "submission": "benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni",
    "status": "disallowed",
    "exitCode": 2,
    "checks": []
  }
  ```

## Scenario: StateFlip 不正解サンプルは終了コード 1 で不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni" を実行
- Then 終了コードは 1

## Scenario: StateFlip 不正解サンプルは不合格と失敗したチェックを表示する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni" を実行
- Then 標準出力に次を含む:

  ```text
  FAIL StateFlip
  checks: 1
  failed checks:
  - run #1: state vector did not match expected amplitudes
    expected / actual mismatches:
    - |0>: expected 0, actual 0.7071067811865475
  ```

## Scenario: StateFlip 不正解サンプルの JSON は failed を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "status": "failed"
  ```

## Scenario: StateFlip 不正解サンプルの JSON は終了コード 1 を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "exitCode": 1
  ```

## Scenario: StateFlip 不正解サンプルの JSON は機械処理できる結果である

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "taskId": "basic-gates/state-flip",
    "title": "StateFlip",
    "submission": "benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni",
    "status": "failed",
    "exitCode": 1,
    "checks": [
      {
        "type": "run",
        "status": "failed"
      }
    ]
  }
  ```

## Scenario: BasisChange の片方の入力だけに合う不正解サンプルがある

- Then リポジトリファイル "benchmarks/incorrect/quantum-katas/basic-gates/basis-change-zero-only.qni" は存在する

## Scenario: BasisChange の片方の入力だけに合う不正解サンプルは不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/basis-change.md benchmarks/incorrect/quantum-katas/basic-gates/basis-change-zero-only.qni" を実行
- Then 終了コードは 1

## Scenario: BasisChange の片方の入力だけに合う不正解サンプルは失敗した採点ケースを表示する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/basis-change.md benchmarks/incorrect/quantum-katas/basic-gates/basis-change-zero-only.qni" を実行
- Then 標準出力に次を含む:

  ```text
  - case one-input run #1: state vector did not match expected amplitudes
  ```

## Scenario: PhaseFlip の片方の入力だけに合う不正解サンプルがある

- Then リポジトリファイル "benchmarks/incorrect/quantum-katas/basic-gates/phase-flip-zero-only.qni" は存在する

## Scenario: PhaseFlip の片方の入力だけに合う不正解サンプルは不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/phase-flip.md benchmarks/incorrect/quantum-katas/basic-gates/phase-flip-zero-only.qni" を実行
- Then 終了コードは 1

## Scenario: PhaseFlip の片方の入力だけに合う不正解サンプルは失敗した採点ケースを表示する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/phase-flip.md benchmarks/incorrect/quantum-katas/basic-gates/phase-flip-zero-only.qni" を実行
- Then 標準出力に次を含む:

  ```text
  - case one-input run #1: state vector did not match expected amplitudes
  ```

## Scenario: BellStateChange3 の符号違い不正解サンプルがある

- Then リポジトリファイル "benchmarks/incorrect/quantum-katas/basic-gates/bell-state-change-3-wrong-sign.qni" は存在する

## Scenario: BellStateChange3 の符号違い不正解サンプルは不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/bell-state-change-3.md benchmarks/incorrect/quantum-katas/basic-gates/bell-state-change-3-wrong-sign.qni" を実行
- Then 終了コードは 1

## Scenario: BellStateChange3 の符号違い不正解サンプルは失敗した採点ケースを表示する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/bell-state-change-3.md benchmarks/incorrect/quantum-katas/basic-gates/bell-state-change-3-wrong-sign.qni" を実行
- Then 標準出力に次を含む:

  ```text
  - run #1: state vector did not match expected amplitudes
  ```

## Scenario: FredkinGate の常に SWAP する不正解サンプルがある

- Then リポジトリファイル "benchmarks/incorrect/quantum-katas/basic-gates/fredkin-gate-unconditional-swap.qni" は存在する

## Scenario: FredkinGate の常に SWAP する不正解サンプルは不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/fredkin-gate.md benchmarks/incorrect/quantum-katas/basic-gates/fredkin-gate-unconditional-swap.qni" を実行
- Then 終了コードは 1

## Scenario: FredkinGate の常に SWAP する不正解サンプルは制御 0 の採点ケースで失敗する

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/fredkin-gate.md benchmarks/incorrect/quantum-katas/basic-gates/fredkin-gate-unconditional-swap.qni" を実行
- Then 標準出力に次を含む:

  ```text
  - case control-zero run #1: state vector did not match expected amplitudes
  ```

## Scenario: GlobalPhaseChange のグローバル位相を掛けない不正解サンプルがある

- Then リポジトリファイル "benchmarks/incorrect/quantum-katas/basic-gates/global-phase-change-no-phase.qni" は存在する

## Scenario: GlobalPhaseChange のグローバル位相を掛けない提出物は不合格になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/global-phase-change.md benchmarks/incorrect/quantum-katas/basic-gates/global-phase-change-no-phase.qni" を実行
- Then 終了コードは 1

## Scenario: GlobalPhaseChange のグローバル位相を掛けない提出物は不合格と表示される

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/global-phase-change.md benchmarks/incorrect/quantum-katas/basic-gates/global-phase-change-no-phase.qni" を実行
- Then 標準出力に次を含む:

  ```text
  FAIL GlobalPhaseChange
  ```

## Scenario: frontmatter 不備の課題ファイルは終了コード 3 になる

- When "qni benchmark run benchmarks/invalid/quantum-katas/basic-gates/state-flip-missing-allowed-commands.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni" を実行
- Then 終了コードは 3

## Scenario: frontmatter 不備の課題ファイルは error と表示される

- When "qni benchmark run benchmarks/invalid/quantum-katas/basic-gates/state-flip-missing-allowed-commands.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni" を実行
- Then 標準出力に次を含む:

  ```text
  ERROR benchmark run
  error: allowed_commands is required
  ```

## Scenario: YAML として壊れた課題ファイルは終了コード 3 になる

- When "qni benchmark run benchmarks/invalid/quantum-katas/basic-gates/state-flip-malformed-frontmatter.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni" を実行
- Then 終了コードは 3

## Scenario: 提出物の構文不備は終了コード 3 になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/error/quantum-katas/basic-gates/state-flip-syntax-error.qni" を実行
- Then 終了コードは 3

## Scenario: qni 実行失敗は終了コード 3 になる

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/error/quantum-katas/basic-gates/state-flip-qni-error.qni" を実行
- Then 終了コードは 3

## Scenario: qni 実行失敗は error と表示される

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/error/quantum-katas/basic-gates/state-flip-qni-error.qni" を実行
- Then 標準出力に次を含む:

  ```text
  ERROR StateFlip
  error: submission command failed at line 1: qni add X --qubit nope --step 0
  ```

## Scenario: qni 実行失敗の JSON は error を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/error/quantum-katas/basic-gates/state-flip-qni-error.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "status": "error"
  ```

## Scenario: qni 実行失敗の JSON は終了コード 3 を含む

- When "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/error/quantum-katas/basic-gates/state-flip-qni-error.qni --json" を実行
- Then 標準出力に次を含む:

  ```text
  "exitCode": 3
  ```

## Scenario: .qni 生成用プロンプトがある

- Then リポジトリファイル "benchmarks/prompts/qni-solution.md" は存在する

## Scenario: .qni 生成用プロンプトは課題本文を読むよう求める

- Then リポジトリファイル "benchmarks/prompts/qni-solution.md" は "課題本文" を含む

## Scenario: .qni 生成用プロンプトは .qni 形式だけで回答するよう求める

- Then リポジトリファイル "benchmarks/prompts/qni-solution.md" は "`.qni` 形式だけ" を含む

## Scenario: MVP手順は StateFlip 標準解の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni" を含む

## Scenario: MVP手順は PlusState 標準解の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/superposition/plus-state.md benchmarks/solutions/quantum-katas/superposition/plus-state.qni" を含む

## Scenario: MVP手順は BasisChange 標準解の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/basic-gates/basis-change.md benchmarks/solutions/quantum-katas/basic-gates/basis-change.qni" を含む

## Scenario: MVP手順は BellStateChange1 標準解の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/basic-gates/bell-state-change-1.md benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-1.qni" を含む

## Scenario: MVP手順は BellStateChange2 標準解の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/basic-gates/bell-state-change-2.md benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-2.qni" を含む

## Scenario: MVP手順は BellStateChange3 標準解の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/basic-gates/bell-state-change-3.md benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-3.qni" を含む

## Scenario: MVP手順は FredkinGate 標準解の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/basic-gates/fredkin-gate.md benchmarks/solutions/quantum-katas/basic-gates/fredkin-gate.qni" を含む

## Scenario: MVP手順は GlobalPhaseChange 標準解の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/basic-gates/global-phase-change.md benchmarks/solutions/quantum-katas/basic-gates/global-phase-change.qni" を含む

## Scenario: MVP手順は SignFlip 標準解の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/basic-gates/sign-flip.md benchmarks/solutions/quantum-katas/basic-gates/sign-flip.qni" を含む

## Scenario: MVP手順は PhaseFlip 標準解の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/basic-gates/phase-flip.md benchmarks/solutions/quantum-katas/basic-gates/phase-flip.qni" を含む

## Scenario: MVP手順は PhaseChangePiOver3 標準解の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/basic-gates/phase-change-pi-over-3.md benchmarks/solutions/quantum-katas/basic-gates/phase-change-pi-over-3.qni" を含む

## Scenario: MVP手順は複数採点ケースの説明を示す

- Then リポジトリファイル "docs/benchmark.md" は "複数採点ケース" を含む

## Scenario: MVP手順は BellState 標準解の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/superposition/bell-state.md benchmarks/solutions/quantum-katas/superposition/bell-state.qni" を含む

## Scenario: MVP手順は GHZState 標準解の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/superposition/ghz-state.md benchmarks/solutions/quantum-katas/superposition/ghz-state.qni" を含む

## Scenario: MVP手順は MinusState 標準解の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/superposition/minus-state.md benchmarks/solutions/quantum-katas/superposition/minus-state.qni" を含む

## Scenario: MVP手順は AllBasisVectors_TwoQubits 標準解の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/superposition/all-basis-vectors-two-qubits.md benchmarks/solutions/quantum-katas/superposition/all-basis-vectors-two-qubits.qni" を含む

## Scenario: MVP手順は不正解サンプルの実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni" を含む

## Scenario: MVP手順は不許可サンプルの実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni" を含む

## Scenario: MVP手順は --json の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni --json" を含む

## Scenario: Quantum Katas スモークセットを一括実行できる

- When "qni benchmark run-all benchmarks/quantum-katas benchmarks/solutions/quantum-katas" を実行
- Then コマンドは成功

## Scenario: Quantum Katas スモークセットの一括実行は各課題の結果を表示する

- When "qni benchmark run-all benchmarks/quantum-katas benchmarks/solutions/quantum-katas" を実行
- Then 標準出力に次を含む:

  ```text
  PASS benchmark suite
  tasks: 22
  passed: 22, failed: 0, disallowed: 0, error: 0
  - passed basic-gates/basis-change BasisChange
  - passed basic-gates/bell-state-change-1 BellStateChange1
  - passed basic-gates/bell-state-change-2 BellStateChange2
  - passed basic-gates/bell-state-change-3 BellStateChange3
  - passed basic-gates/fredkin-gate FredkinGate
  - passed basic-gates/global-phase-change GlobalPhaseChange
  - passed basic-gates/phase-change-pi-over-3 PhaseChangePiOver3
  - passed basic-gates/phase-flip PhaseFlip
  - passed basic-gates/sign-flip SignFlip
  - passed basic-gates/state-flip StateFlip
  - passed basic-gates/toffoli-gate ToffoliGate
  - passed basic-gates/two-qubit-gate-1 TwoQubitGate1
  - passed basic-gates/two-qubit-gate-2 TwoQubitGate2
  - passed basic-gates/two-qubit-gate-3 TwoQubitGate3
  - passed basic-gates/two-qubit-gate-4 TwoQubitGate4
  - passed superposition/all-basis-vector-with-phase-flip-two-qubits AllBasisVectorWithPhaseFlip_TwoQubits
  - passed superposition/all-basis-vectors-two-qubits AllBasisVectors_TwoQubits
  - passed superposition/all-basis-vectors-with-phases-two-qubits AllBasisVectorsWithPhases_TwoQubits
  - passed superposition/bell-state BellState
  - passed superposition/ghz-state GHZState
  - passed superposition/minus-state MinusState
  - passed superposition/plus-state PlusState
  ```

## Scenario: Quantum Katas スモークセットの一括実行 JSON は集計と各課題結果を含む

- When "qni benchmark run-all benchmarks/quantum-katas benchmarks/solutions/quantum-katas --json" を実行
- Then 標準出力は次の JSON と一致する:

  ```json
  {
    "status": "passed",
    "exitCode": 0,
    "summary": {
      "disallowed": 0,
      "error": 0,
      "failed": 0,
      "passed": 22,
      "total": 22
    },
    "results": [
      {
        "taskId": "basic-gates/basis-change",
        "title": "BasisChange",
        "submission": "benchmarks/solutions/quantum-katas/basic-gates/basis-change.qni",
        "status": "passed",
        "exitCode": 0,
        "gradingCases": [
          {
            "caseId": "zero-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "one-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          }
        ],
        "checks": [
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/basic-gates/basis-change.md"
      },
      {
        "taskId": "basic-gates/bell-state-change-1",
        "title": "BellStateChange1",
        "submission": "benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-1.qni",
        "status": "passed",
        "exitCode": 0,
        "gradingCases": [
          {
            "caseId": "phi-plus-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          }
        ],
        "checks": [
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/basic-gates/bell-state-change-1.md"
      },
      {
        "taskId": "basic-gates/bell-state-change-2",
        "title": "BellStateChange2",
        "submission": "benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-2.qni",
        "status": "passed",
        "exitCode": 0,
        "gradingCases": [
          {
            "caseId": "phi-plus-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          }
        ],
        "checks": [
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/basic-gates/bell-state-change-2.md"
      },
      {
        "taskId": "basic-gates/bell-state-change-3",
        "title": "BellStateChange3",
        "submission": "benchmarks/solutions/quantum-katas/basic-gates/bell-state-change-3.qni",
        "status": "passed",
        "exitCode": 0,
        "gradingCases": [
          {
            "caseId": "phi-plus-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          }
        ],
        "checks": [
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/basic-gates/bell-state-change-3.md"
      },
      {
        "taskId": "basic-gates/fredkin-gate",
        "title": "FredkinGate",
        "submission": "benchmarks/solutions/quantum-katas/basic-gates/fredkin-gate.qni",
        "status": "passed",
        "exitCode": 0,
        "gradingCases": [
          {
            "caseId": "control-zero",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "control-one",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          }
        ],
        "checks": [
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/basic-gates/fredkin-gate.md"
      },
      {
        "taskId": "basic-gates/global-phase-change",
        "title": "GlobalPhaseChange",
        "submission": "benchmarks/solutions/quantum-katas/basic-gates/global-phase-change.qni",
        "status": "passed",
        "exitCode": 0,
        "gradingCases": [
          {
            "caseId": "target-zero",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "target-one",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          }
        ],
        "checks": [
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/basic-gates/global-phase-change.md"
      },
      {
        "taskId": "basic-gates/phase-change-pi-over-3",
        "title": "PhaseChangePiOver3",
        "submission": "benchmarks/solutions/quantum-katas/basic-gates/phase-change-pi-over-3.qni",
        "status": "passed",
        "exitCode": 0,
        "gradingCases": [
          {
            "caseId": "zero-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "one-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          }
        ],
        "checks": [
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/basic-gates/phase-change-pi-over-3.md"
      },
      {
        "taskId": "basic-gates/phase-flip",
        "title": "PhaseFlip",
        "submission": "benchmarks/solutions/quantum-katas/basic-gates/phase-flip.qni",
        "status": "passed",
        "exitCode": 0,
        "gradingCases": [
          {
            "caseId": "zero-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "one-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          }
        ],
        "checks": [
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/basic-gates/phase-flip.md"
      },
      {
        "taskId": "basic-gates/sign-flip",
        "title": "SignFlip",
        "submission": "benchmarks/solutions/quantum-katas/basic-gates/sign-flip.qni",
        "status": "passed",
        "exitCode": 0,
        "gradingCases": [
          {
            "caseId": "plus-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "minus-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          }
        ],
        "checks": [
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/basic-gates/sign-flip.md"
      },
      {
        "taskId": "basic-gates/state-flip",
        "title": "StateFlip",
        "submission": "benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni",
        "status": "passed",
        "exitCode": 0,
        "checks": [
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/basic-gates/state-flip.md"
      },
      {
        "taskId": "basic-gates/toffoli-gate",
        "title": "ToffoliGate",
        "submission": "benchmarks/solutions/quantum-katas/basic-gates/toffoli-gate.qni",
        "status": "passed",
        "exitCode": 0,
        "gradingCases": [
          {
            "caseId": "zero-zero-zero-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "one-one-zero-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "one-one-one-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "one-zero-one-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "superposition-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          }
        ],
        "checks": [
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/basic-gates/toffoli-gate.md"
      },
      {
        "taskId": "basic-gates/two-qubit-gate-1",
        "title": "TwoQubitGate1",
        "submission": "benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-1.qni",
        "status": "passed",
        "exitCode": 0,
        "gradingCases": [
          {
            "caseId": "zero-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "one-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "superposition-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          }
        ],
        "checks": [
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/basic-gates/two-qubit-gate-1.md"
      },
      {
        "taskId": "basic-gates/two-qubit-gate-2",
        "title": "TwoQubitGate2",
        "submission": "benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-2.qni",
        "status": "passed",
        "exitCode": 0,
        "gradingCases": [
          {
            "caseId": "plus-plus-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "eleven-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "ten-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          }
        ],
        "checks": [
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/basic-gates/two-qubit-gate-2.md"
      },
      {
        "taskId": "basic-gates/two-qubit-gate-3",
        "title": "TwoQubitGate3",
        "submission": "benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-3.qni",
        "status": "passed",
        "exitCode": 0,
        "gradingCases": [
          {
            "caseId": "zero-zero-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "zero-one-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "one-zero-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "superposition-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          }
        ],
        "checks": [
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/basic-gates/two-qubit-gate-3.md"
      },
      {
        "taskId": "basic-gates/two-qubit-gate-4",
        "title": "TwoQubitGate4",
        "submission": "benchmarks/solutions/quantum-katas/basic-gates/two-qubit-gate-4.qni",
        "status": "passed",
        "exitCode": 0,
        "gradingCases": [
          {
            "caseId": "zero-zero-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "zero-one-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "one-zero-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          },
          {
            "caseId": "superposition-input",
            "status": "passed",
            "checks": [
              {
                "type": "run",
                "status": "passed"
              }
            ]
          }
        ],
        "checks": [
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          },
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/basic-gates/two-qubit-gate-4.md"
      },
      {
        "taskId": "superposition/all-basis-vector-with-phase-flip-two-qubits",
        "title": "AllBasisVectorWithPhaseFlip_TwoQubits",
        "submission": "benchmarks/solutions/quantum-katas/superposition/all-basis-vector-with-phase-flip-two-qubits.qni",
        "status": "passed",
        "exitCode": 0,
        "checks": [
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/superposition/all-basis-vector-with-phase-flip-two-qubits.md"
      },
      {
        "taskId": "superposition/all-basis-vectors-two-qubits",
        "title": "AllBasisVectors_TwoQubits",
        "submission": "benchmarks/solutions/quantum-katas/superposition/all-basis-vectors-two-qubits.qni",
        "status": "passed",
        "exitCode": 0,
        "checks": [
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/superposition/all-basis-vectors-two-qubits.md"
      },
      {
        "taskId": "superposition/all-basis-vectors-with-phases-two-qubits",
        "title": "AllBasisVectorsWithPhases_TwoQubits",
        "submission": "benchmarks/solutions/quantum-katas/superposition/all-basis-vectors-with-phases-two-qubits.qni",
        "status": "passed",
        "exitCode": 0,
        "checks": [
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/superposition/all-basis-vectors-with-phases-two-qubits.md"
      },
      {
        "taskId": "superposition/bell-state",
        "title": "BellState",
        "submission": "benchmarks/solutions/quantum-katas/superposition/bell-state.qni",
        "status": "passed",
        "exitCode": 0,
        "checks": [
          {
            "type": "expect",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/superposition/bell-state.md"
      },
      {
        "taskId": "superposition/ghz-state",
        "title": "GHZState",
        "submission": "benchmarks/solutions/quantum-katas/superposition/ghz-state.qni",
        "status": "passed",
        "exitCode": 0,
        "checks": [
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/superposition/ghz-state.md"
      },
      {
        "taskId": "superposition/minus-state",
        "title": "MinusState",
        "submission": "benchmarks/solutions/quantum-katas/superposition/minus-state.qni",
        "status": "passed",
        "exitCode": 0,
        "checks": [
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/superposition/minus-state.md"
      },
      {
        "taskId": "superposition/plus-state",
        "title": "PlusState",
        "submission": "benchmarks/solutions/quantum-katas/superposition/plus-state.qni",
        "status": "passed",
        "exitCode": 0,
        "checks": [
          {
            "type": "run",
            "status": "passed"
          }
        ],
        "task": "benchmarks/quantum-katas/superposition/plus-state.md"
      }
    ]
  }
  ```

## Scenario: MVP手順は run-all の実行例を示す

- Then リポジトリファイル "docs/benchmark.md" は "qni benchmark run-all benchmarks/quantum-katas benchmarks/solutions/quantum-katas" を含む
