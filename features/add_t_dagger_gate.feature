Feature: T† ゲートを追加
  qni-cli のユーザとして
  コマンドラインから量子回路を組み立てるために
  指定した step と qubit に T† ゲートを追加したい

  Scenario: T† ゲート追加で circuit.json を作成
    When "qni add T† --qubit 0 --step 0" を実行
    Then "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["T†"]
        ]
      }
      """
    When "qni view" を実行
    Then 回路図:
      """
          ┌────┐
      q0: ┤ T† ├
          └────┘
      """
