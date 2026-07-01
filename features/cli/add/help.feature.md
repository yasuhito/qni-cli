# Feature: add コマンドのヘルプ表示

qni-cli の利用者として、add コマンドの使い方を確認するために、
`qni add` の使い方をヘルプで見たい。

## Scenario: qni add は成功する

- When "qni add" を実行
- Then コマンドは成功

## Scenario: qni add は add コマンドの使い方を表示

- When "qni add" を実行
- Then 標準出力:

  ```text
  Usage:
    qni add GATE --qubit=N --step=N
    qni add GATE --control=CONTROL --qubit=N --step=N
    qni add ANGLED_GATE --angle=ANGLE --qubit=N --step=N
    qni add ANGLED_GATE --angle=ANGLE --control=CONTROL --qubit=N --step=N
    qni add SWAP --qubit=N,N --step=N
    qni add SWAP --control=CONTROL --qubit=N,N --step=N

  Overview:
    Add a gate to ./circuit.json.
    If ./circuit.json does not exist, qni creates the smallest circuit that can hold the gate.
    step and qubit are 0-based indices.
    Supported gates: H, X, Y, Z, S, S†, T, T†, √X, P, Rx, Ry, Rz, GlobalPhase, SWAP.
    With --control, GATE is placed on --qubit and "•" is placed on each control qubit.
    CNOT is written as qni add X --control 0 --qubit 1 --step 0.
    ANGLED_GATE can be P, Rx, Ry, Rz, or GlobalPhase and is saved as GATE(angle).
    SWAP uses exactly two target qubits and writes "Swap" to both slots.
    With --control, SWAP becomes controlled-SWAP and writes "•" to each control slot.

  Options:
    --step=N             # 0-based step index
    --qubit=N            # 0-based qubit index
    [--control=CONTROL]  # comma-separated control qubit indices
    [--angle=ANGLE]      # angle for P, Rx, Ry, Rz, or GlobalPhase, such as π/3 or pi/3

  Examples:
    qni add H --qubit 0 --step 0
    qni add X --qubit 1 --step 3
    qni add X --control 0 --qubit 1 --step 0
    qni add H --control 0 --qubit 2 --step 4
    qni add √X --qubit 0 --step 1
    qni add S† --qubit 1 --step 2
    qni add P --angle π/3 --qubit 0 --step 1
    qni add Rx --angle π/2 --qubit 0 --step 2
    qni add Rz --angle pi/4 --control 0 --qubit 1 --step 3
    qni add GlobalPhase --angle 2π --qubit 0 --step 4
    qni add SWAP --qubit 0,1 --step 0
    qni add SWAP --control 0 --qubit 1,2 --step 0
  ```

## Scenario: qni add --help は成功する

- When "qni add --help" を実行
- Then コマンドは成功

## Scenario: qni add --help は add コマンドの使い方を表示

- When "qni add --help" を実行
- Then 標準出力:

  ```text
  Usage:
    qni add GATE --qubit=N --step=N
    qni add GATE --control=CONTROL --qubit=N --step=N
    qni add ANGLED_GATE --angle=ANGLE --qubit=N --step=N
    qni add ANGLED_GATE --angle=ANGLE --control=CONTROL --qubit=N --step=N
    qni add SWAP --qubit=N,N --step=N
    qni add SWAP --control=CONTROL --qubit=N,N --step=N

  Overview:
    Add a gate to ./circuit.json.
    If ./circuit.json does not exist, qni creates the smallest circuit that can hold the gate.
    step and qubit are 0-based indices.
    Supported gates: H, X, Y, Z, S, S†, T, T†, √X, P, Rx, Ry, Rz, GlobalPhase, SWAP.
    With --control, GATE is placed on --qubit and "•" is placed on each control qubit.
    CNOT is written as qni add X --control 0 --qubit 1 --step 0.
    ANGLED_GATE can be P, Rx, Ry, Rz, or GlobalPhase and is saved as GATE(angle).
    SWAP uses exactly two target qubits and writes "Swap" to both slots.
    With --control, SWAP becomes controlled-SWAP and writes "•" to each control slot.

  Options:
    --step=N             # 0-based step index
    --qubit=N            # 0-based qubit index
    [--control=CONTROL]  # comma-separated control qubit indices
    [--angle=ANGLE]      # angle for P, Rx, Ry, Rz, or GlobalPhase, such as π/3 or pi/3

  Examples:
    qni add H --qubit 0 --step 0
    qni add X --qubit 1 --step 3
    qni add X --control 0 --qubit 1 --step 0
    qni add H --control 0 --qubit 2 --step 4
    qni add √X --qubit 0 --step 1
    qni add S† --qubit 1 --step 2
    qni add P --angle π/3 --qubit 0 --step 1
    qni add Rx --angle π/2 --qubit 0 --step 2
    qni add Rz --angle pi/4 --control 0 --qubit 1 --step 3
    qni add GlobalPhase --angle 2π --qubit 0 --step 4
    qni add SWAP --qubit 0,1 --step 0
    qni add SWAP --control 0 --qubit 1,2 --step 0
  ```
