Feature: qni bloch コマンド
  qni-cli のユーザとして
  1 qubit の状態を幾何学的に理解するために
  qni bloch でブロッホ球の PNG や APNG や inline 表示を使いたい

  Scenario: qni bloch --png は 1 qubit 回路のブロッホ球 PNG を書き出す
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni bloch --png --output bloch.png" を実行
    Then コマンドは成功
    And "bloch.png" は PNG 画像である
    And "bloch.png" は透過 PNG 画像である
    And "bloch.png" の画像サイズは 512x512 である

  Scenario: qni bloch --png --light は light theme のブロッホ球 PNG を書き出す
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni bloch --png --light --output bloch-light.png" を実行
    Then コマンドは成功
    And "bloch-light.png" は PNG 画像である

  Scenario: qni bloch は z 軸ラベルと |0> ラベルを重ならない位置に配置する
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni bloch --png --light --output bloch-layout.png" を実行
    Then コマンドは成功
    And ブロッホ球のラベル "z" の表示は z 軸の先端より上にある
    And ブロッホ球のラベル "|0>" の表示は z 軸の先端より上にある
    And ブロッホ球のラベル "z" と "|0>" の表示領域は重ならない
    And ブロッホ球のラベル "x" の表示は x 軸の先端より右にある
    And ブロッホ球のラベル "|+>" の表示は x 軸の先端より右にある
    And ブロッホ球のラベル "x" と "|+>" の表示領域は重ならない
    And ブロッホ球のラベル "|+i>" が表示される
    And ブロッホ球のラベル "|-i>" が表示される
    And ブロッホ球のラベル "|+i>" の表示は y 軸の先端より右にある
    And ブロッホ球のラベル "|+i>" の表示は y 軸の先端より上にある
    And ブロッホ球のラベル "y" と "|+i>" の表示領域は重ならない

  Scenario: qni bloch --png --trajectory は X ゲートのブロッホ球 PNG に軌跡を描く
    Given "qni add X --qubit 0 --step 0" を実行
    When "qni bloch --png --output bloch.png" を実行
    Then コマンドは成功
    When "qni bloch --png --trajectory --light --output bloch-trajectory.png" を実行
    Then コマンドは成功
    And "bloch-trajectory.png" は PNG 画像である
    And "bloch-trajectory.png" は色 "#0f766e" のピクセルを含む
    And "bloch.png" と "bloch-trajectory.png" は異なるファイル内容である

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

  Scenario: qni bloch は --png と --apng の同時指定で失敗する
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni bloch --png --apng --output bloch.png" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      choose exactly one of --png, --apng, or --inline
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
    When "qni bloch --apng --animate --output bloch.png" を実行
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
      inline bloch rendering requires a Kitty-compatible terminal; use --png or --apng instead
      """
