# Feature: GlobalPhase 操作を追加

qni-cli の利用者として、Quantum Katas BasicGates の GlobalPhaseChange を自然に表すために、
状態全体へ同じ位相を掛ける GlobalPhase 操作を回路に追加したい。

## Scenario: GlobalPhase 操作追加で circuit.json を作成

- When "qni add GlobalPhase --angle 2π --qubit 0 --step 0" を実行
- Then "circuit.json" の内容:

  ```json
  {
    "qubits": 1,
    "cols": [
      ["GlobalPhase(2π)"]
    ]
  }
  ```

## Scenario: qni run は単独 GlobalPhase 操作を状態ベクトルに反映する

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add GlobalPhase --angle 2π --qubit 0 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  -0.7071067811865475,-0.7071067811865475
  ```

## Scenario: qni run は制御付き GlobalPhase 操作を相対位相として反映する

- Given "qni add H --qubit 0 --step 0" を実行
- And "qni add GlobalPhase --angle 2π --control 0 --qubit 1 --step 1" を実行
- When "qni run" を実行
- Then 標準出力:

  ```text
  0.7071067811865475,0.0,-0.7071067811865475,0.0
  ```

## Scenario: qni view は GlobalPhase 操作を表示する

- Given "qni add GlobalPhase --angle π --qubit 0 --step 0" を実行
- When "qni view" を実行
- Then 標準出力に次を含む:

  ```text
  q0: ┤ GlobalPhase ├
  ```

## Scenario: qni add --help は GlobalPhase 操作を説明する

- When "qni add --help" を実行
- Then 標準出力に次を含む:

  ```text
  ANGLED_GATE can be P, Rx, Ry, Rz, or GlobalPhase and is saved as GATE(angle).
  ```
