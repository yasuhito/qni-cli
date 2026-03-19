Feature: qni clear コマンド
  qni-cli のユーザとして
  回路を最初から作り直せるようにするために
  qni clear を実行したい

  Scenario: qni clear は既存の circuit.json を削除する
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni clear" を実行
    Then コマンドは成功
    And "circuit.json" は存在しない

  Scenario: qni clear の標準出力は空
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni clear" を実行
    Then 標準出力は空

  Scenario: qni clear は circuit.json がなくても成功
    When "qni clear" を実行
    Then コマンドは成功
    And "circuit.json" は存在しない
