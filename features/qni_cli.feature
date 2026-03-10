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

      Overview:
        Add a gate to ./circuit.json.
        If ./circuit.json does not exist, qni creates the smallest circuit that can hold the gate.
        step and qubit are 0-based indices.
        Supported gates: H, X, Y, Z, S, T.
        With --control, GATE is placed on --qubit and "•" is placed on each control qubit.
        CNOT is written as qni add X --control 0 --qubit 1 --step 0.

      Options:
        --step=N             # 0-based step index
        --qubit=N            # 0-based qubit index
        [--control=CONTROL]  # comma-separated control qubit indices

      Examples:
        qni add H --qubit 0 --step 0
        qni add X --qubit 1 --step 3
        qni add X --control 0 --qubit 1 --step 0
        qni add H --control 0 --qubit 2 --step 4
      """

  シナリオ: qni add --help は add コマンドの使い方を表示
    もし "qni add --help" を実行
    ならば コマンドは成功
    かつ 標準出力:
      """
      Usage:
        qni add GATE --qubit=N --step=N
        qni add GATE --control=CONTROL --qubit=N --step=N

      Overview:
        Add a gate to ./circuit.json.
        If ./circuit.json does not exist, qni creates the smallest circuit that can hold the gate.
        step and qubit are 0-based indices.
        Supported gates: H, X, Y, Z, S, T.
        With --control, GATE is placed on --qubit and "•" is placed on each control qubit.
        CNOT is written as qni add X --control 0 --qubit 1 --step 0.

      Options:
        --step=N             # 0-based step index
        --qubit=N            # 0-based qubit index
        [--control=CONTROL]  # comma-separated control qubit indices

      Examples:
        qni add H --qubit 0 --step 0
        qni add X --qubit 1 --step 3
        qni add X --control 0 --qubit 1 --step 0
        qni add H --control 0 --qubit 2 --step 4
      """

  シナリオ: qni help は使えない
    もし "qni help add" を実行
    ならば コマンドは失敗
    かつ 標準エラー:
      """
      qni help is not available; use qni or qni COMMAND --help
      """
