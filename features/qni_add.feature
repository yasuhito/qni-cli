Feature: qni add コマンド
  qni-cli のユーザとして
  コマンドラインから量子回路を更新するために
  qni add コマンドを実行したい

  Scenario: qni add H の標準出力は空
    When "qni add H --qubit 0 --step 0" を実行
    Then 標準出力は空

  Scenario: qni add X with control コマンドは成功
    When "qni add X --control 0 --qubit 1 --step 0" を実行
    Then コマンドは成功

  Scenario: qni add X with control の標準出力は空
    When "qni add X --control 0 --qubit 1 --step 0" を実行
    Then 標準出力は空

  Scenario: qni add SWAP コマンドは成功
    When "qni add SWAP --qubit 0,1 --step 0" を実行
    Then コマンドは成功

  Scenario: すでに H があるスロットへの qni add は失敗
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni add H --qubit 0 --step 0" を実行
    Then コマンドは失敗

  Scenario: 既存回路に新しい qubit を追加できる
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni add H --qubit 1 --step 0" を実行
    Then "circuit.json" の内容:
      """
      {
        "qubits": 2,
        "cols": [
          ["H", "H"]
        ]
      }
      """
