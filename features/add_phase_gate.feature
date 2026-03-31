Feature: Phase ゲートを追加
  qni-cli のユーザとして
  コマンドラインから量子回路を組み立てるために
  指定した step と qubit に Phase ゲートを追加したい

  Scenario: Phase ゲート追加で circuit.json を作成
    When "qni add P --angle π/3 --qubit 0 --step 0" を実行
    Then "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["P(π/3)"]
        ]
      }
      """
    When "qni view" を実行
    Then 回路図:
      """
            π/3
          ┌───┐
      q0: ┤ P ├
          └───┘
      """

  Scenario: Phase ゲート追加で負の変数 angle を保存できる
    When "qni add P --angle=-alpha --qubit 0 --step 0" を実行
    Then "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["P(-alpha)"]
        ]
      }
      """

  Scenario: Phase ゲートは angle がないと追加できない
    When "qni add P --qubit 0 --step 0" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      angle is required for P
      """
