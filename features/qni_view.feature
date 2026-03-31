Feature: qni view コマンド
  qni-cli のユーザとして
  量子回路の内容を確認するために
  qni view でアスキーアートな回路図を表示したい

  Scenario: qni view コマンドは成功
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni view" を実行
    Then コマンドは成功

  Scenario: qni view は H ゲートを表示
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
          ┌───┐
      q0: ┤ H ├
          └───┘
      """

  Scenario: qni view は X ゲートを表示
    Given "qni add X --qubit 0 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
          ┌───┐
      q0: ┤ X ├
          └───┘
      """

  Scenario: qni view は Y ゲートを表示
    Given "qni add Y --qubit 0 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
          ┌───┐
      q0: ┤ Y ├
          └───┘
      """

  Scenario: qni view は Z ゲートを表示
    Given "qni add Z --qubit 0 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
          ┌───┐
      q0: ┤ Z ├
          └───┘
      """

  Scenario: qni view は S ゲートを表示
    Given "qni add S --qubit 0 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
          ┌───┐
      q0: ┤ S ├
          └───┘
      """

  Scenario: qni view は S† ゲートを表示
    Given "qni add S† --qubit 0 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
          ┌───┐
      q0: ┤ S†├
          └───┘
      """

  Scenario: qni view は T ゲートを表示
    Given "qni add T --qubit 0 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
          ┌───┐
      q0: ┤ T ├
          └───┘
      """

  Scenario: qni view は T† ゲートを表示
    Given "qni add T† --qubit 0 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
          ┌───┐
      q0: ┤ T†├
          └───┘
      """

  Scenario: qni view は TTY では T† の修飾子を dim 表示する
    Given "qni add T† --qubit 0 --step 0" を実行
    When "qni view" を TTY で実行
    Then コマンドは成功
    And 標準出力に dim 修飾付きラベル "T†" を含む

  Scenario: qni view は √X ゲートを表示
    Given "qni add √X --qubit 0 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
          ┌───┐
      q0: ┤√X ├
          └───┘
      """

  Scenario: qni view は Phase ゲートを表示
    Given "qni add P --angle π/3 --qubit 0 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
            π/3
          ┌───┐
      q0: ┤ P ├
          └───┘
      """

  Scenario: qni view は Rx ゲートを表示
    Given "qni add Rx --angle π/2 --qubit 0 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
            π/2
          ┌───┐
      q0: ┤ Rx├
          └───┘
      """

  Scenario: qni view は Ry ゲートを表示
    Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
            π/2
          ┌───┐
      q0: ┤ Ry├
          └───┘
      """

  Scenario: qni view は TTY では Ry の修飾子を dim 表示する
    Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
    When "qni view" を TTY で実行
    Then コマンドは成功
    And 標準出力に dim 修飾付きラベル "Ry" を含む

  Scenario: qni view は Rz ゲートを表示
    Given "qni add Rz --angle π/2 --qubit 0 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
            π/2
          ┌───┐
      q0: ┤ Rz├
          └───┘
      """

  Scenario: qni view は SWAP ゲートを表示
    Given "qni add SWAP --qubit 0,1 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
      q0: ─X─
           │
      q1: ─X─
      """

  Scenario: qni view は CNOT ゲートを表示
    Given "qni add X --control 0 --qubit 1 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
      q0: ──■──
          ┌─┴─┐
      q1: ┤ X ├
          └───┘
      """

  Scenario: qni view は control 付き √X ゲートを表示
    Given "qni add √X --control 0 --qubit 1 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
      q0: ──■──
          ┌─┴─┐
      q1: ┤√X ├
          └───┘
      """

  Scenario: qni view は control 付き Rz ゲートを表示
    Given "qni add Rz --angle π/2 --control 0 --qubit 1 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
      q0: ──■──
            π/2
          ┌─┴─┐
      q1: ┤ Rz├
          └───┘
      """

  Scenario: qni view は control 付き T† ゲートを表示
    Given "qni add T† --control 0 --qubit 1 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
      q0: ──■──
          ┌─┴─┐
      q1: ┤ T†├
          └───┘
      """

  Scenario: 同じ step の 2 qubit に H がある回路を表示
    Given "qni add H --qubit 0 --step 0" を実行
    And "qni add H --qubit 1 --step 0" を実行
    When "qni view" を実行
    Then 回路図:
      """
          ┌───┐
      q0: ┤ H ├
          ├───┤
      q1: ┤ H ├
          └───┘
      """

  Scenario: 回路 json がないとき qni view はエラーメッセージを出して失敗
    When "qni view" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      circuit.json does not exist
      """
