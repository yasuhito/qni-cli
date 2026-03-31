Feature: qni run コマンド
  qni-cli のユーザとして
  量子回路の状態ベクトルを確認するために
  qni run を実行したい

  Scenario: qni run コマンドは成功
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then コマンドは成功

  Scenario: qni run は状態ベクトルを標準出力に表示
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.7071067811865475,0.7071067811865475
      """

  Scenario: qni run は何もゲートを適用しない |0> の状態ベクトルを標準出力に表示
    Given 空の 1 qubit 回路がある
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0
      """

  Scenario: qni run は X ゲートの状態ベクトルを標準出力に表示
    Given "qni add X --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,1.0
      """

  Scenario: qni run は Y ゲートの状態ベクトルを標準出力に表示
    Given "qni add Y --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,1.0i
      """

  Scenario: qni run は Z ゲートの状態ベクトルを標準出力に表示
    Given "qni add Z --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0
      """

  Scenario: qni run は S ゲートの状態ベクトルを標準出力に表示
    Given "qni add S --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0
      """

  Scenario: qni run は S† ゲートの状態ベクトルを標準出力に表示
    Given "qni add S† --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0
      """

  Scenario: qni run は T ゲートの状態ベクトルを標準出力に表示
    Given "qni add T --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0
      """

  Scenario: qni run は T† ゲートの状態ベクトルを標準出力に表示
    Given "qni add T† --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0
      """

  Scenario: qni run は √X ゲートの状態ベクトルを標準出力に表示
    Given "qni add √X --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.5+0.5i,0.5-0.5i
      """

  Scenario: qni run は Phase ゲートの状態ベクトルを標準出力に表示
    Given "qni add P --angle π/3 --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0
      """

  Scenario: qni run は Rx ゲートの状態ベクトルを標準出力に表示
    Given "qni add Rx --angle π/2 --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.7071067811865476,-0.7071067811865475i
      """

  Scenario: qni run は Ry ゲートの状態ベクトルを標準出力に表示
    Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.7071067811865476,0.7071067811865475
      """

  Scenario: qni run は変数 angle を解決して Ry ゲートの状態ベクトルを表示
    Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
    And "qni variable set theta π/2" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.7071067811865476,0.7071067811865475
      """

  Scenario: qni run は未束縛の変数 angle があると失敗
    Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      unresolved angle variable: theta
      """

  Scenario: qni run --symbolic は初期状態ベクトル alpha|0> + beta|1> に X を適用する
    Given "qni state set \"alpha|0> + beta|1>\"" を実行
    And "qni add X --qubit 0 --step 0" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      beta|0> + alpha|1>
      """

  Scenario: qni run は変数解決した初期状態ベクトルから数値実行する
    Given "qni state set \"alpha|0> + beta|1>\"" を実行
    And "qni variable set alpha 0.6" を実行
    And "qni variable set beta 0.8" を実行
    And "qni add X --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.8,0.6
      """

  Scenario: qni run は未束縛の初期状態変数では失敗する
    Given "qni state set \"alpha|0> + beta|1>\"" を実行
    When "qni run" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      unresolved initial state variable: alpha
      """

  Scenario: qni run は非正規化の初期状態ベクトルでは失敗する
    Given "qni state set \"alpha|0> + beta|1>\"" を実行
    And "qni variable set alpha 1" を実行
    And "qni variable set beta 1" を実行
    When "qni run" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      initial state must be normalized
      """

  Scenario: qni run は負の変数 angle を解決して Phase ゲートの状態ベクトルを表示
    Given "qni add X --qubit 0 --step 0" を実行
    And "qni add P --angle=-alpha --qubit 0 --step 1" を実行
    And "qni variable set alpha π/3" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,0.5000000000000001-0.8660254037844386i
      """

  Scenario: qni run は単純な角度式と変数を解決して Ry ゲートの状態ベクトルを表示
    Given "qni add Ry --angle 2*alpha --qubit 0 --step 0" を実行
    And "qni variable set alpha π/4" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.7071067811865476,0.7071067811865475
      """

  Scenario: qni run は負の単純な角度式と変数を解決して Ry ゲートの状態ベクトルを表示
    Given "qni add Ry --angle -2*alpha --qubit 0 --step 0" を実行
    And "qni variable set alpha π/4" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.7071067811865476,-0.7071067811865475
      """

  Scenario: qni run は Rz ゲートの状態ベクトルを標準出力に表示
    Given "qni add Rz --angle π/2 --qubit 0 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.7071067811865476-0.7071067811865475i,0.0
      """

  Scenario: qni run は SWAP を |00> に適用した状態ベクトルを標準出力に表示
    Given 空の 2 qubit 回路がある
    And "qni add SWAP --qubit 0,1 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0,0.0,0.0
      """

  Scenario: qni run は SWAP を |01> に適用した状態ベクトルを標準出力に表示
    Given 2 qubit の初期状態が "|01>" である
    And "qni add SWAP --qubit 0,1 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,0.0,1.0,0.0
      """

  Scenario: qni run は SWAP を |10> に適用した状態ベクトルを標準出力に表示
    Given 2 qubit の初期状態が "|10>" である
    And "qni add SWAP --qubit 0,1 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,1.0,0.0,0.0
      """

  Scenario: qni run は SWAP を |11> に適用した状態ベクトルを標準出力に表示
    Given 2 qubit の初期状態が "|11>" である
    And "qni add SWAP --qubit 0,1 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,0.0,0.0,1.0
      """

  Scenario: qni run は CNOT を |00> に適用した状態ベクトルを標準出力に表示
    Given 空の 2 qubit 回路がある
    And "qni add X --control 0 --qubit 1 --step 0" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0,0.0,0.0
      """

  Scenario: qni run は CNOT を |01> に適用した状態ベクトルを標準出力に表示
    Given 2 qubit の初期状態が "|01>" である
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,1.0,0.0,0.0
      """

  Scenario: qni run は CNOT を |10> に適用した状態ベクトルを標準出力に表示
    Given 2 qubit の初期状態が "|10>" である
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,0.0,0.0,1.0
      """

  Scenario: qni run は CNOT を |11> に適用した状態ベクトルを標準出力に表示
    Given 2 qubit の初期状態が "|11>" である
    And "qni add X --control 0 --qubit 1 --step 2" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,0.0,1.0,0.0
      """

  Scenario: qni run --symbolic は Bell 状態の |Φ⁻⟩ を表示
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add Z --qubit 0 --step 2" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      sqrt(2)/2|00> - sqrt(2)/2|11>
      """

  Scenario: qni run は |1> に H ゲートを適用した状態ベクトルを標準出力に表示
    Given "qni add X --qubit 0 --step 0" を実行
    And "qni add H --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.7071067811865475,-0.7071067811865475
      """

  Scenario: qni run は |1> に X ゲートを適用した状態ベクトルを標準出力に表示
    Given "qni add X --qubit 0 --step 0" を実行
    And "qni add X --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0
      """

  Scenario: qni run は |1> に Y ゲートを適用した状態ベクトルを標準出力に表示
    Given "qni add X --qubit 0 --step 0" を実行
    And "qni add Y --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      -1.0i,0.0
      """

  Scenario: qni run は |1> に Z ゲートを適用した状態ベクトルを標準出力に表示
    Given "qni add X --qubit 0 --step 0" を実行
    And "qni add Z --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,-1.0
      """

  Scenario: qni run は |1> に S ゲートを適用した状態ベクトルを標準出力に表示
    Given "qni add X --qubit 0 --step 0" を実行
    And "qni add S --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,1.0i
      """

  Scenario: qni run は |1> に S† ゲートを適用した状態ベクトルを標準出力に表示
    Given "qni add X --qubit 0 --step 0" を実行
    And "qni add S† --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,-1.0i
      """

  Scenario: qni run は |1> に T ゲートを適用した状態ベクトルを標準出力に表示
    Given "qni add X --qubit 0 --step 0" を実行
    And "qni add T --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,0.7071067811865476+0.7071067811865475i
      """

  Scenario: qni run は |1> に T† ゲートを適用した状態ベクトルを標準出力に表示
    Given "qni add X --qubit 0 --step 0" を実行
    And "qni add T† --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,0.7071067811865476-0.7071067811865475i
      """

  Scenario: qni run は |1> に √X ゲートを適用した状態ベクトルを標準出力に表示
    Given "qni add X --qubit 0 --step 0" を実行
    And "qni add √X --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.5-0.5i,0.5+0.5i
      """

  Scenario: qni run は |1> に Phase ゲートを適用した状態ベクトルを標準出力に表示
    Given "qni add X --qubit 0 --step 0" を実行
    And "qni add P --angle π/3 --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,0.5000000000000001+0.8660254037844386i
      """

  Scenario: qni run は |1> に Rx ゲートを適用した状態ベクトルを標準出力に表示
    Given "qni add X --qubit 0 --step 0" を実行
    And "qni add Rx --angle π/2 --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      -0.7071067811865475i,0.7071067811865476
      """

  Scenario: qni run は |1> に Ry ゲートを適用した状態ベクトルを標準出力に表示
    Given "qni add X --qubit 0 --step 0" を実行
    And "qni add Ry --angle π/2 --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      -0.7071067811865475,0.7071067811865476
      """

  Scenario: qni run は |1> に Rz ゲートを適用した状態ベクトルを標準出力に表示
    Given "qni add X --qubit 0 --step 0" を実行
    And "qni add Rz --angle π/2 --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,0.7071067811865476+0.7071067811865475i
      """

  Scenario: qni run --symbolic は H ゲートの状態を ket 形式で表示
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      sqrt(2)/2|0> + sqrt(2)/2|1>
      """

  Scenario: qni run --symbolic --basis x は H ゲートの状態を |+>, |-> で表示
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni run --symbolic --basis x" を実行
    Then 標準出力:
      """
      |+>
      """

  Scenario: qni run --symbolic --basis x は alpha|0> + beta|1> に H を適用した結果を |+>, |-> で表示
    Given "qni state set \"alpha|0> + beta|1>\"" を実行
    And "qni add H --qubit 0 --step 0" を実行
    When "qni run --symbolic --basis x" を実行
    Then 標準出力:
      """
      alpha|+> + beta|->
      """

  Scenario: qni run --symbolic は Y ゲートの純虚数係数を表示
    Given "qni add Y --qubit 0 --step 0" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      1.0i|1>
      """

  Scenario: qni run --symbolic は未束縛の角度変数を記号のまま表示
    Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      cos(theta/2)|0> + sin(theta/2)|1>
      """

  Scenario: qni run --symbolic は単純な角度式を簡約して表示
    Given "qni add Ry --angle 2*alpha --qubit 0 --step 0" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      cos(alpha)|0> + sin(alpha)|1>
      """

  Scenario: qni run --symbolic は具体的な π 角度も exact に表示
    Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      sqrt(2)/2|0> + sqrt(2)/2|1>
      """

  Scenario: qni run --symbolic は 2 qubit の空回路を ket 形式で表示
    Given 空の 2 qubit 回路がある
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      1|00>
      """

  Scenario: qni run --symbolic --basis x は 2 qubit 回路では失敗
    Given 空の 2 qubit 回路がある
    When "qni run --symbolic --basis x" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      symbolic x-basis run currently supports only 1-qubit circuits
      """

  Scenario: qni run --symbolic は 3 qubit 回路では失敗
    Given 空の 3 qubit 回路がある
    When "qni run --symbolic" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      symbolic run currently supports only 1-qubit and 2-qubit circuits
      """

  Scenario: qni run --basis x は --symbolic なしでは失敗
    Given 空の 1 qubit 回路がある
    When "qni run --basis x" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      --basis requires --symbolic
      """
