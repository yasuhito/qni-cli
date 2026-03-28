Feature: Ry ゲートを追加
  qni-cli のユーザとして
  コマンドラインから量子回路を組み立てるために
  指定した step と qubit に Ry ゲートを追加したい

  Scenario: Ry ゲート追加で circuit.json を作成
    When "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
    Then "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Ry(π/2)"]
        ]
      }
      """
    When "qni view" を実行
    Then 回路図:
      """
          ┌────┐
      q0: ┤ Ry ├
          └────┘
      """

  Scenario: Ry ゲートは変数 angle をそのまま保存できる
    When "qni add Ry --angle theta --qubit 0 --step 0" を実行
    Then "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Ry(theta)"]
        ]
      }
      """

  Scenario: Ry ゲートは単純な角度式をそのまま保存できる
    When "qni add Ry --angle 2*alpha --qubit 0 --step 0" を実行
    Then "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Ry(2*alpha)"]
        ]
      }
      """
