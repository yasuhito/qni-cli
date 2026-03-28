Feature: qni CLI
  qni-cli のユーザとして
  利用できるコマンドを知るために
  qni だけ実行してヘルプを見たい

  Scenario: qni はコマンド一覧を表示
    When "qni" を実行
    Then コマンドは成功
    And 標準出力:
      """
      qni commands:
        qni add       # Add a gate to the circuit
        qni clear     # Delete the current circuit file
        qni expect    # Show expectation values of Pauli strings
        qni export    # Export the circuit as qcircuit LaTeX or PNG
        qni run       # Show the state vector of the circuit
        qni variable  # Manage symbolic angle variables
        qni view      # Render the circuit as ASCII art
      """

  Scenario: qni add は add コマンドの使い方を表示
    When "qni add" を実行
    Then コマンドは成功
    And 標準出力:
      """
      Usage:
        qni add GATE --qubit=N --step=N
        qni add GATE --control=CONTROL --qubit=N --step=N
        qni add ANGLED_GATE --angle=ANGLE --qubit=N --step=N
        qni add ANGLED_GATE --angle=ANGLE --control=CONTROL --qubit=N --step=N
        qni add SWAP --qubit=N,N --step=N

      Overview:
        Add a gate to ./circuit.json.
        If ./circuit.json does not exist, qni creates the smallest circuit that can hold the gate.
        step and qubit are 0-based indices.
        Supported gates: H, X, Y, Z, S, S†, T, T†, √X, P, Rx, Ry, Rz, SWAP.
        With --control, GATE is placed on --qubit and "•" is placed on each control qubit.
        CNOT is written as qni add X --control 0 --qubit 1 --step 0.
        ANGLED_GATE can be P, Rx, Ry, or Rz and is saved as GATE(angle).
        SWAP uses exactly two target qubits and writes "Swap" to both slots.

      Options:
        --step=N             # 0-based step index
        --qubit=N            # 0-based qubit index
        [--control=CONTROL]  # comma-separated control qubit indices
        [--angle=ANGLE]      # angle for P, Rx, Ry, or Rz, such as π/3 or pi/3

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
        qni add SWAP --qubit 0,1 --step 0
      """

  Scenario: qni add --help は add コマンドの使い方を表示
    When "qni add --help" を実行
    Then コマンドは成功
    And 標準出力:
      """
      Usage:
        qni add GATE --qubit=N --step=N
        qni add GATE --control=CONTROL --qubit=N --step=N
        qni add ANGLED_GATE --angle=ANGLE --qubit=N --step=N
        qni add ANGLED_GATE --angle=ANGLE --control=CONTROL --qubit=N --step=N
        qni add SWAP --qubit=N,N --step=N

      Overview:
        Add a gate to ./circuit.json.
        If ./circuit.json does not exist, qni creates the smallest circuit that can hold the gate.
        step and qubit are 0-based indices.
        Supported gates: H, X, Y, Z, S, S†, T, T†, √X, P, Rx, Ry, Rz, SWAP.
        With --control, GATE is placed on --qubit and "•" is placed on each control qubit.
        CNOT is written as qni add X --control 0 --qubit 1 --step 0.
        ANGLED_GATE can be P, Rx, Ry, or Rz and is saved as GATE(angle).
        SWAP uses exactly two target qubits and writes "Swap" to both slots.

      Options:
        --step=N             # 0-based step index
        --qubit=N            # 0-based qubit index
        [--control=CONTROL]  # comma-separated control qubit indices
        [--angle=ANGLE]      # angle for P, Rx, Ry, or Rz, such as π/3 or pi/3

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
        qni add SWAP --qubit 0,1 --step 0
      """

  Scenario: qni expect は expect コマンドの使い方を表示
    When "qni expect" を実行
    Then コマンドは成功
    And 標準出力:
      """
      Usage:
        qni expect PAULI_STRING [PAULI_STRING...]

      Overview:
        Calculate expectation values from ./circuit.json.
        qni simulates the whole circuit and evaluates each Pauli string on the resulting state.
        Each PAULI_STRING must use only I, X, Y, and Z.
        The length of each PAULI_STRING must match the circuit qubit count.
        Output is one line per observable in the form PAULI_STRING=value.

      Examples:
        qni expect Z
        qni expect ZZ XX
        qni expect ZZI IZZ XXX
      """

  Scenario: qni expect --help は expect コマンドの使い方を表示
    When "qni expect --help" を実行
    Then コマンドは成功
    And 標準出力:
      """
      Usage:
        qni expect PAULI_STRING [PAULI_STRING...]

      Overview:
        Calculate expectation values from ./circuit.json.
        qni simulates the whole circuit and evaluates each Pauli string on the resulting state.
        Each PAULI_STRING must use only I, X, Y, and Z.
        The length of each PAULI_STRING must match the circuit qubit count.
        Output is one line per observable in the form PAULI_STRING=value.

      Examples:
        qni expect Z
        qni expect ZZ XX
        qni expect ZZI IZZ XXX
      """

  Scenario: qni clear --help は clear コマンドの使い方を表示
    When "qni clear --help" を実行
    Then コマンドは成功
    And 標準出力:
      """
      Usage:
        qni clear

      Overview:
        Delete ./circuit.json.
        If ./circuit.json does not exist, qni clear still succeeds.
        Standard output is empty on success.

      Examples:
        qni clear
      """

  Scenario: qni variable は variable コマンドの使い方を表示
    When "qni variable" を実行
    Then コマンドは成功
    And 標準出力:
      """
      Usage:
        qni variable set NAME ANGLE
        qni variable list
        qni variable unset NAME
        qni variable clear

      Overview:
        Manage symbolic angle variables in ./circuit.json.
        NAME must be an ASCII identifier such as theta.
        ANGLE must be concrete, such as π/4, pi/3, or 0.5.
        qni variable set requires ./circuit.json to already exist.
        qni add Ry --angle theta --qubit 0 --step 0 stores Ry(theta).
        qni run and qni expect resolve symbolic angles through these variables.

      Examples:
        qni variable set theta π/4
        qni variable list
        qni variable unset theta
        qni variable clear
      """

  Scenario: qni variable --help は variable コマンドの使い方を表示
    When "qni variable --help" を実行
    Then コマンドは成功
    And 標準出力:
      """
      Usage:
        qni variable set NAME ANGLE
        qni variable list
        qni variable unset NAME
        qni variable clear

      Overview:
        Manage symbolic angle variables in ./circuit.json.
        NAME must be an ASCII identifier such as theta.
        ANGLE must be concrete, such as π/4, pi/3, or 0.5.
        qni variable set requires ./circuit.json to already exist.
        qni add Ry --angle theta --qubit 0 --step 0 stores Ry(theta).
        qni run and qni expect resolve symbolic angles through these variables.

      Examples:
        qni variable set theta π/4
        qni variable list
        qni variable unset theta
        qni variable clear
      """

  Scenario: qni help は使えない
    When "qni help add" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      qni help is not available; use qni or qni COMMAND --help
      """
