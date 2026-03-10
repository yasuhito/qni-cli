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
        qni add             # Add a gate to the circuit
        qni help [COMMAND]  # Describe available commands or one specific command
        qni run             # Show the state vector of the circuit
        qni view            # Render the circuit as ASCII art
      """

  シナリオ: qni add は add コマンドの使い方を表示
    もし "qni add" を実行
    ならば コマンドは成功
    かつ 標準出力:
      """
      Usage:
        qni add GATE --step=N

      Options:
        --step=N             # 0-based step index
        [--qubit=N]          # 0-based qubit index
        [--control=CONTROL]  # comma-separated control qubit indices

      Add a gate to the circuit
      """

  シナリオ: qni add --help は add コマンドの使い方を表示
    もし "qni add --help" を実行
    ならば コマンドは成功
    かつ 標準出力:
      """
      Usage:
        qni add GATE --step=N

      Options:
        --step=N             # 0-based step index
        [--qubit=N]          # 0-based qubit index
        [--control=CONTROL]  # comma-separated control qubit indices

      Add a gate to the circuit
      """
