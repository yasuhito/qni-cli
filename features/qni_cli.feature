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

  Scenario: qni gate は qubit が整数でないとエラーを表示
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni gate --qubit nope --step 0" を実行
    Then コマンドは失敗して標準エラー:
      """
      qubit must be an integer
      """

  Scenario: qni help は使えない
    When "qni help add" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      qni help is not available; use qni or qni COMMAND --help
      """
