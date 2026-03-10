# language: ja
機能: qni CLI
  qni-cli のユーザとして
  利用できるコマンドを知るために
  qni だけ実行してヘルプを見たい

  シナリオ: qni はコマンド一覧を表示
    もし "qni" を実行
    ならば コマンドは成功
    かつ 標準出力:
      """
      qni commands:
        qni add   # Add a gate to the circuit
        qni run   # Show the state vector of the circuit
        qni view  # Render the circuit as ASCII art
      """

  シナリオ: qni add は add コマンドの使い方を表示
    もし "qni add" を実行
    ならば コマンドは成功
    かつ 標準出力:
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

  シナリオ: qni add --help は add コマンドの使い方を表示
    もし "qni add --help" を実行
    ならば コマンドは成功
    かつ 標準出力:
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

  シナリオ: qni help は使えない
    もし "qni help add" を実行
    ならば コマンドは失敗
    かつ 標準エラー:
      """
      qni help is not available; use qni or qni COMMAND --help
      """
