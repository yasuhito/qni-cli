Feature: qni state コマンド
  qni-cli のユーザとして
  初期状態ベクトルを設定・表示・解除するために
  qni state コマンドを使いたい

  Scenario: qni state set は alpha|0> + beta|1> を保存する
    When "qni state set \"alpha|0> + beta|1>\"" を実行
    Then コマンドは成功
    And circuit.json:
      """
      {
        "qubits": 1,
        "initial_state": {
          "format": "ket_sum_v1",
          "terms": [
            {
              "basis": "0",
              "coefficient": "alpha"
            },
            {
              "basis": "1",
              "coefficient": "beta"
            }
          ]
        },
        "cols": [
          [
            1
          ]
        ]
      }
      """

  Scenario: qni state show は現在の初期状態を表示する
    Given "qni state set \"alpha|0> + beta|1>\"" を実行
    When "qni state show" を実行
    Then コマンドは成功
    And 標準出力:
      """
      alpha|0> + beta|1>
      """

  Scenario: qni state set は |+> を shorthand のまま表示できる初期状態として保存する
    When "qni state set \"|+>\"" を実行
    Then コマンドは成功
    And "qni state show" を実行
    And 標準出力:
      """
      |+>
      """

  Scenario: qni state set は |-> を shorthand のまま表示できる初期状態として保存する
    When "qni state set \"|->\"" を実行
    Then コマンドは成功
    And "qni state show" を実行
    And 標準出力:
      """
      |->
      """

  Scenario: qni state clear は初期状態設定を削除する
    Given "qni state set \"alpha|0> + beta|1>\"" を実行
    When "qni state clear" を実行
    Then コマンドは成功
    And circuit.json:
      """
      {
        "qubits": 1,
        "cols": [
          [
            1
          ]
        ]
      }
      """
