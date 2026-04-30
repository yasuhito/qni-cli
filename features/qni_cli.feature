Feature: qni CLI
  qni-cli のユーザとして
  利用できるコマンドを知るために
  qni だけ実行してヘルプを見たい

  Scenario: qni はコマンド一覧を表示
    When "qni" を実行
    Then コマンドは成功
    And 標準出力:
      """
      qni commands:
        qni add       # Add a gate to the circuit
        qni bloch     # Render the current 1-qubit state on the Bloch sphere
        qni clear     # Delete the current circuit file
        qni expect    # Show expectation values of Pauli strings
        qni export    # Export the circuit as qcircuit LaTeX or PNG
        qni gate      # Show the gate at a circuit slot
        qni rm        # Remove a gate from the circuit
        qni run       # Show the state vector of the circuit
        qni state     # Manage the initial state vector
        qni variable  # Manage symbolic angle variables
        qni view      # Render the circuit as ASCII art
      """

  Scenario: qni gate は qubit が整数でないとエラーを表示
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni gate --qubit nope --step 0" を実行
    Then コマンドは失敗して標準エラー:
      """
      qubit must be an integer
      """

  Scenario: qni clear --help は clear コマンドの使い方を表示
    When "qni clear --help" を実行
    Then コマンドは成功
    And 標準出力:
      """
      Usage:
        qni clear

      Overview:
        Delete ./circuit.json.
        If ./circuit.json does not exist, qni clear still succeeds.
        Standard output is empty on success.

      Examples:
        qni clear
      """

  Scenario: qni variable は variable コマンドの使い方を表示
    When "qni variable" を実行
    Then コマンドは成功
    And 標準出力:
      """
      Usage:
        qni variable set NAME ANGLE
        qni variable list
        qni variable unset NAME
        qni variable clear

      Overview:
        Manage symbolic angle variables in ./circuit.json.
        NAME must be an ASCII identifier such as theta.
        ANGLE must be concrete, such as π/4, pi/3, or 0.5.
        qni variable set requires ./circuit.json to already exist.
        qni add Ry --angle theta --qubit 0 --step 0 stores Ry(theta).
        qni run and qni expect resolve symbolic angles through these variables.

      Examples:
        qni variable set theta π/4
        qni variable list
        qni variable unset theta
        qni variable clear
      """

  Scenario: qni variable --help は variable コマンドの使い方を表示
    When "qni variable --help" を実行
    Then コマンドは成功
    And 標準出力:
      """
      Usage:
        qni variable set NAME ANGLE
        qni variable list
        qni variable unset NAME
        qni variable clear

      Overview:
        Manage symbolic angle variables in ./circuit.json.
        NAME must be an ASCII identifier such as theta.
        ANGLE must be concrete, such as π/4, pi/3, or 0.5.
        qni variable set requires ./circuit.json to already exist.
        qni add Ry --angle theta --qubit 0 --step 0 stores Ry(theta).
        qni run and qni expect resolve symbolic angles through these variables.

      Examples:
        qni variable set theta π/4
        qni variable list
        qni variable unset theta
        qni variable clear
      """

  Scenario: qni state --help は state コマンドの使い方を表示
    When "qni state --help" を実行
    Then コマンドは成功
    And 標準出力に次を含む:
      """
      qni state set "alpha|0> + beta|1>"
      """

  Scenario: qni bloch --help は bloch コマンドの使い方を表示
    When "qni bloch --help" を実行
    Then コマンドは成功
    And 標準出力:
      """
      Usage:
        qni bloch --png --output bloch.png
        qni bloch --png --trajectory --output bloch.png
        qni bloch --apng --output bloch.png
        qni bloch --inline
        qni bloch --inline --animate

      Overview:
        Render the current 1-qubit state on the Bloch sphere.
        --png writes a static Bloch sphere image.
        --apng writes an animated Bloch sphere showing state evolution.
        --inline draws the Bloch sphere directly in a Kitty-compatible terminal.
        The first release supports only 1-qubit circuits with fully resolved numeric parameters.

      Options:
        --png           # write a Bloch sphere PNG
        --apng          # write a Bloch sphere APNG
        --inline        # render a Bloch sphere inline in a Kitty-compatible terminal
        --animate       # animate inline Bloch output; valid only with --inline
        --trajectory    # draw the sampled state-evolution trail on the Bloch sphere
        --dark          # draw light content for dark backgrounds (default)
        --light         # draw dark content for light backgrounds
        [--output=PATH] # output file path; required for --png and --apng

      Examples:
        qni bloch --png --output bloch.png
        qni bloch --png --trajectory --output bloch.png
        qni bloch --apng --output bloch.png
        qni bloch --png --light --output bloch.png
        qni bloch --inline
        qni bloch --inline --animate
      """

  Scenario: qni help は使えない
    When "qni help add" を実行
    Then コマンドは失敗
    And 標準エラー:
      """
      qni help is not available; use qni or qni COMMAND --help
      """