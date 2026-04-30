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
        qni bloch     # Render the current 1-qubit state on the Bloch sphere
        qni clear     # Delete the current circuit file
        qni expect    # Show expectation values of Pauli strings
        qni export    # Export the circuit as qcircuit LaTeX or PNG
        qni gate      # Show the gate at a circuit slot
        qni rm        # Remove a gate from the circuit
        qni run       # Show the state vector of the circuit
        qni state     # Manage the initial state vector
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

  Scenario: qni gate は gate コマンドの使い方を表示
    When "qni gate" を実行
    Then コマンドは成功して標準出力:
      """
      Usage:
        qni gate --qubit=N --step=N

      Overview:
        Print one serialized cell value from ./circuit.json.
        step and qubit are 0-based indices.
        If the cell contains "H", qni gate prints H.

      Options:
        --step=N   # 0-based step index
        --qubit=N  # 0-based qubit index

      Examples:
        qni gate --qubit 0 --step 0
      """

  Scenario: qni gate --help は gate コマンドの使い方を表示
    When "qni gate --help" を実行
    Then コマンドは成功して標準出力:
      """
      Usage:
        qni gate --qubit=N --step=N

      Overview:
        Print one serialized cell value from ./circuit.json.
        step and qubit are 0-based indices.
        If the cell contains "H", qni gate prints H.

      Options:
        --step=N   # 0-based step index
        --qubit=N  # 0-based qubit index

      Examples:
        qni gate --qubit 0 --step 0
      """

  Scenario: qni gate は qubit が整数でないとエラーを表示
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni gate --qubit nope --step 0" を実行
    Then コマンドは失敗して標準エラー:
      """
      qubit must be an integer
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

  Scenario: qni state --help は state コマンドの使い方を表示
    When "qni state --help" を実行
    Then コマンドは成功
    And 標準出力に次を含む:
      """
      qni state set "alpha|0> + beta|1>"
      """

  Scenario: qni bloch --help は bloch コマンドの使い方を表示
    When "qni bloch --help" を実行
    Then コマンドは成功
    And 標準出力:
      """
      Usage:
        qni bloch --png --output bloch.png
        qni bloch --png --trajectory --output bloch.png
        qni bloch --apng --output bloch.png
        qni bloch --inline
        qni bloch --inline --animate

      Overview:
        Render the current 1-qubit state on the Bloch sphere.
        --png writes a static Bloch sphere image.
        --apng writes an animated Bloch sphere showing state evolution.
        --inline draws the Bloch sphere directly in a Kitty-compatible terminal.
        The first release supports only 1-qubit circuits with fully resolved numeric parameters.

      Options:
        --png           # write a Bloch sphere PNG
        --apng          # write a Bloch sphere APNG
        --inline        # render a Bloch sphere inline in a Kitty-compatible terminal
        --animate       # animate inline Bloch output; valid only with --inline
        --trajectory    # draw the sampled state-evolution trail on the Bloch sphere
        --dark          # draw light content for dark backgrounds (default)
        --light         # draw dark content for light backgrounds
        [--output=PATH] # output file path; required for --png and --apng

      Examples:
        qni bloch --png --output bloch.png
        qni bloch --png --trajectory --output bloch.png
        qni bloch --apng --output bloch.png
        qni bloch --png --light --output bloch.png
        qni bloch --inline
        qni bloch --inline --animate
      """

  Scenario: qni run --help は symbolic basis option を表示
    When "qni run --help" を実行
    Then コマンドは成功
    And 標準出力に次を含む:
      """
      [--symbolic] [--basis=BASIS]
      """
    And 標準出力に次を含む:
      """
      Show a symbolic state in a named basis such as x, y, or bell
      """

  Scenario: qni help は使えない
    When "qni help add" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      qni help is not available; use qni or qni COMMAND --help
      """
