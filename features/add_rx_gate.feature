Feature: Rx ゲートを追加
  qni-cli のユーザとして
  コマンドラインから量子回路を組み立てるために
  指定した step と qubit に Rx ゲートを追加したい

  Scenario: Rx ゲート追加で circuit.json を作成
    When "qni add Rx --angle π/2 --qubit 0 --step 0" を実行
    Then "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Rx(π/2)"]
        ]
      }
      """
    When "qni view" を実行
    Then 回路図:
      """
          ┌───┐
      q0: ┤ Rx├
          └───┘
      """

  Scenario: Rx ゲートは angle がないと追加できない
    When "qni add Rx --qubit 0 --step 0" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      angle is required for Rx
      """
