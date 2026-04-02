Feature: qni export コマンド
  qni-cli のユーザとして
  回路図や状態表示を外部ツールで表示したり保存したりするために
  qni export で qcircuit LaTeX や PNG を出力したい

  Scenario: qni export --help は export コマンドの使い方を表示
    When "qni export --help" を実行
    Then コマンドは成功
    And 標準出力:
      """
      Usage:
        qni export --latex-source [--output=PATH]
        qni export --png --output=PATH
        qni export --state-vector --png --output=PATH
        qni export --circle-notation --png --output=PATH

      Overview:
        Export ./circuit.json as qcircuit LaTeX or PNG.
        --latex-source writes qcircuit LaTeX to standard output by default.
        With --output=PATH, --latex-source writes the LaTeX file instead.
        --png renders the qcircuit LaTeX with pdflatex and converts the PDF to PNG with pdftocairo.
        --state-vector renders the symbolic state vector as LaTeX and converts it to PNG.
        --circle-notation renders the final computational-basis state as a circle-notation PNG.
        qni export follows qni's step constraints, so one step can contain simple 1-qubit gates, one controlled gate, or one 2-qubit SWAP.

      Options:
        --latex-source  # write qcircuit LaTeX
        --png           # write PNG rendered from qcircuit LaTeX
        --state-vector  # write the symbolic state vector as PNG
        --circle-notation # write the computational-basis circle notation as PNG
        --dark          # draw white circuit lines for dark backgrounds (default)
        --light         # draw black circuit lines for light backgrounds
        [--output=PATH] # output file path; required for --png

      Examples:
        qni export --latex-source
        qni export --latex-source --output circuit.tex
        qni export --latex-source --light
        qni export --png --output circuit.png
        qni export --png --dark --output circuit.png
        qni export --state-vector --png --output state.png
        qni export --circle-notation --png --output circles.png
      """

  Scenario: qni export --latex-source はデフォルトで dark theme の qcircuit LaTeX を標準出力へ出す
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni export --latex-source" を実行
    Then コマンドは成功
    And 標準出力に次を含む:
      """
      \usepackage[braket, qm]{qcircuit}
      """
    And 標準出力に次を含む:
      """
      \usepackage{xcolor}
      """
    And 標準出力に次を含む:
      """
      \Qcircuit
      """
    And 標準出力に次を含む:
      """
      \gate{\mathrm{H}}
      """
    And 標準出力に次を含む:
      """
      \color{white}
      """

  Scenario: qni export --latex-source --light は light theme の qcircuit LaTeX を標準出力へ出す
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni export --latex-source --light" を実行
    Then コマンドは成功
    And 標準出力に次を含む:
      """
      \color{black}
      """
    And 標準出力に次を含まない:
      """
      \color{white}
      """

  Scenario: qni export --latex-source は CNOT を control と target で出力する
    Given "qni add X --control 0 --qubit 1 --step 0" を実行
    When "qni export --latex-source" を実行
    Then コマンドは成功
    And 標準出力に次を含む:
      """
      \ctrl{1}
      """
    And 標準出力に次を含む:
      """
      \targ
      """

  Scenario: qni export --latex-source は SWAP を qswap と qwx で出力する
    Given "qni add SWAP --qubit 0,1 --step 0" を実行
    When "qni export --latex-source" を実行
    Then コマンドは成功
    And 標準出力に次を含む:
      """
      \qswap
      """
    And 標準出力に次を含む:
      """
      \qwx[-1]
      """

  Scenario: qni export --dark と --light を同時指定すると失敗する
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni export --latex-source --dark --light" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      choose at most one of --dark or --light
      """

  Scenario: qni export --png --light は PNG ファイルを書き出す
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni export --png --light --output circuit.png" を実行
    Then コマンドは成功
    And 標準出力は空
    And "circuit.png" は PNG 画像である

  Scenario: qni export --png は透過 PNG ファイルを書き出す
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni export --png --output circuit.png" を実行
    Then コマンドは成功
    And "circuit.png" は透過 PNG 画像である

  Scenario: qni export --png は 1x1 回路を 64x64 で書き出す
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni export --png --output circuit.png" を実行
    Then コマンドは成功
    And "circuit.png" の画像サイズは 64x64 である

  Scenario: qni export --png は 2x2 回路を 128x128 で書き出す
    Given "qni add H --qubit 0 --step 0" を実行
    And "qni add H --qubit 1 --step 1" を実行
    When "qni export --png --output circuit.png" を実行
    Then コマンドは成功
    And "circuit.png" の画像サイズは 128x128 である

  Scenario: qni export --state-vector --png は symbolic state vector の PNG を書き出す
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni export --state-vector --png --output state.png" を実行
    Then コマンドは成功
    And "state.png" は PNG 画像である
    And "state.png" は透過 PNG 画像である

  Scenario: qni export --state-vector --png は回路 PNG と異なる画像を書き出す
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni export --png --output circuit.png" を実行
    And "qni export --state-vector --png --output state.png" を実行
    Then コマンドは成功
    And "circuit.png" と "state.png" は異なるファイル内容である

  Scenario: qni export --state-vector --png は 3 qubit 回路では失敗する
    Given 空の 3 qubit 回路がある
    When "qni export --state-vector --png --output state.png" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      symbolic run currently supports only 1-qubit and 2-qubit circuits
      """

  Scenario: qni export --circle-notation --png は 1 qubit 状態の PNG を書き出す
    Given "qni state set |+>" を実行
    When "qni export --circle-notation --png --output circles.png" を実行
    Then コマンドは成功
    And "circles.png" は PNG 画像である
    And "circles.png" は透過 PNG 画像である

  Scenario: qni export --circle-notation --png は 2 qubit Bell 状態の PNG を書き出す
    Given "qni state set |Φ+>" を実行
    When "qni export --circle-notation --png --output circles.png" を実行
    Then コマンドは成功
    And "circles.png" は PNG 画像である
    And "circles.png" は透過 PNG 画像である

  Scenario: qni export --circle-notation は振幅が小さくても位相針を外円まで描く
    Given "qni state set '0.1|0> + 0.99498743710662|1>'" を実行
    When "qni export --circle-notation --png --light --output circles.png" を実行
    Then コマンドは成功
    And "circles.png" は PNG 画像である
    And circle notation renderer では振幅 0.1 の位相針の長さは外円の半径に等しい
    And circle notation renderer では外円の輪郭線は内側へ食い込まない

  Scenario: qni export --circle-notation は qni と同じ位相向きを使う
    Given "qni state set '|+>'" を実行
    When "qni export --circle-notation --png --light --output circles.png" を実行
    Then コマンドは成功
    And "circles.png" は PNG 画像である
    And circle notation renderer では正の実数振幅の位相針は上を向く
    And circle notation renderer では正の虚数振幅の位相針は左を向く

  Scenario: qni export --circle-notation は振幅が 0 のときだけ位相針を描かない
    Given 空の 1 qubit 回路がある
    When "qni export --circle-notation --png --light --output circles.png" を実行
    Then コマンドは成功
    And "circles.png" は PNG 画像である
    And circle notation renderer では振幅 0 のとき位相針は描画されない
    And circle notation renderer では振幅 0 のとき中心ドットも描画されない

  Scenario: qni export --circle-notation --png は state-vector PNG と異なる画像を書き出す
    Given "qni state set |Φ+>" を実行
    When "qni export --circle-notation --png --output circles.png" を実行
    And "qni export --state-vector --png --output state.png" を実行
    Then コマンドは成功
    And "circles.png" と "state.png" は異なるファイル内容である

  Scenario: qni export --circle-notation は --png なしでは失敗する
    Given "qni state set |+>" を実行
    When "qni export --circle-notation --output circles.png" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      --circle-notation currently supports only --png
      """

  Scenario: qni export --circle-notation と --state-vector を同時指定すると失敗する
    Given "qni state set |+>" を実行
    When "qni export --circle-notation --state-vector --png --output circles.png" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      choose at most one of --state-vector or --circle-notation
      """

  Scenario: qni export --circle-notation --png は 3 qubit 回路では失敗する
    Given 空の 3 qubit 回路がある
    When "qni export --circle-notation --png --output circles.png" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      circle notation currently supports only 1-qubit and 2-qubit circuits
      """
