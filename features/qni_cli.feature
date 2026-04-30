Feature: qni CLI
  qni-cli のユーザとして
  CLI 共通のエラーを理解するために
  qni コマンドの境界条件を確認したい

  Scenario: qni gate は qubit が整数でないとエラーを表示
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni gate --qubit nope --step 0" を実行
    Then コマンドは失敗

  Scenario: qni gate は qubit が整数でないとエラー内容を表示
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni gate --qubit nope --step 0" を実行
    Then 標準エラー:
      """
      qubit must be an integer
      """
