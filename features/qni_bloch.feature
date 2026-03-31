Feature: qni bloch コマンド
  qni-cli のユーザとして
  1 qubit の状態を幾何学的に理解するために
  qni bloch でブロッホ球の PNG や GIF や inline 表示を使いたい

  Scenario: qni bloch --png は 1 qubit 回路のブロッホ球 PNG を書き出す
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni bloch --png --output bloch.png" を実行
    Then コマンドは成功
    And "bloch.png" は PNG 画像である
    And "bloch.png" は透過 PNG 画像である
    And "bloch.png" の画像サイズは 512x512 である

  Scenario: qni bloch --gif は回転ゲートを含む 1 qubit 回路のブロッホ球 GIF を書き出す
    Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
    When "qni bloch --gif --output bloch.gif" を実行
    Then コマンドは成功
    And "bloch.gif" は GIF 画像である
    And "bloch.gif" は 2 フレーム以上の GIF 画像である

  Scenario: qni bloch --png --light は light theme のブロッホ球 PNG を書き出す
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni bloch --png --light --output bloch-light.png" を実行
    Then コマンドは成功
    And "bloch-light.png" は PNG 画像である

  Scenario: qni bloch --inline は 1 qubit 回路のブロッホ球を Kitty graphics protocol で表示する
    Given "qni add H --qubit 0 --step 0" を実行
    And 環境変数 "QNI_TEST_FORCE_INLINE" を "1" に設定する
    When "qni bloch --inline" を TTY で実行
    Then コマンドは成功
    And 標準出力は Kitty graphics escape sequence を含む

  Scenario: qni bloch --inline --animate は回転ゲートのブロッホ球を inline animation で表示する
    Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
    And 環境変数 "QNI_TEST_FORCE_INLINE" を "1" に設定する
    When "qni bloch --inline --animate" を TTY で実行
    Then コマンドは成功
    And 標準出力は 2 個以上の Kitty graphics escape sequence を含む

  Scenario: qni bloch は 2 qubit 回路では失敗する
    Given 空の 2 qubit 回路がある
    When "qni bloch --png --output bloch.png" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      bloch currently supports only 1-qubit circuits
      """

  Scenario: qni bloch は未解決の角度変数を含むと失敗する
    Given "qni add Ry --angle theta --qubit 0 --step 0" を実行
    When "qni bloch --png --output bloch.png" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      unresolved angle variable: theta
      """

  Scenario: qni bloch は --png と --gif の同時指定で失敗する
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni bloch --png --gif --output bloch.png" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      choose exactly one of --png, --gif, or --inline
      """

  Scenario: qni bloch は --inline と --output の同時指定で失敗する
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni bloch --inline --output bloch.png" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      --output is not supported with --inline
      """

  Scenario: qni bloch は --animate を --inline なしでは使えない
    Given "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
    When "qni bloch --gif --animate --output bloch.gif" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      --animate is supported only with --inline
      """

  Scenario: qni bloch --inline は unsupported terminal では失敗する
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni bloch --inline" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      inline bloch rendering requires a Kitty-compatible terminal; use --png or --gif instead
      """
