Feature: qni variable コマンド
  qni-cli のユーザとして
  角度変数を使って回路を再利用するために
  qni variable を実行したい

  Scenario: qni variable set は circuit.json に変数を保存する
    Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
    When "qni variable set theta π/4" を実行
    Then "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Ry(theta)"]
        ],
        "variables": {
          "theta": "π/4"
        }
      }
      """

  Scenario: qni variable list は変数を一覧表示する
    Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
    And "qni variable set theta π/4" を実行
    And "qni variable set phi π/2" を実行
    When "qni variable list" を実行
    Then 標準出力:
      """
      phi=π/2
      theta=π/4
      """

  Scenario: qni variable unset は指定した変数を削除する
    Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
    And "qni variable set theta π/4" を実行
    When "qni variable unset theta" を実行
    Then "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Ry(theta)"]
        ]
      }
      """

  Scenario: qni variable clear はすべての変数を削除する
    Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
    And "qni variable set theta π/4" を実行
    And "qni variable set phi π/2" を実行
    When "qni variable clear" を実行
    Then "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Ry(theta)"]
        ]
      }
      """

  Scenario: qni variable set は circuit.json がないと失敗
    When "qni variable set theta π/4" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      circuit.json does not exist
      """
