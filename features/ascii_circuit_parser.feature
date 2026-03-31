Feature: ASCII アート回路セットアップ
  qni-cli の feature を読みやすく書くために
  回路図の ASCII アートから回路を作りたい

  Scenario: 1 qubit の空回路を ASCII アートから作る
    Given 次の回路がある:
      """
      q0: ─────
      """
    Then 状態ベクトルは:
      """
      |0>
      """

  Scenario: 1 qubit の X 回路を ASCII アートから作る
    Given 次の回路がある:
      """
          ┌───┐
      q0: ┤ X ├
          └───┘
      """
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,1.0
      """

  Scenario: 1 qubit の X-X 回路を ASCII アートから作る
    Given 次の回路がある:
      """
          ┌───┐┌───┐
      q0: ┤ X ├┤ X ├
          └───┘└───┘
      """
    Then 状態ベクトルは:
      """
      |0>
      """

  Scenario: 2 qubit の controlled X 回路を ASCII アートから作る
    Given 2 qubit の初期状態が "|10>" である
    When 次の回路を適用:
      """
      q0: ──■──
          ┌─┴─┐
      q1: ┤ X ├
          └───┘
      """
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,0.0,0.0,1.0
      """

  Scenario: 1 qubit の Ry(π/2) 回路を拡張 ASCII から作る
    Given 次の回路がある:
      """
           π/2
          ┌───┐
      q0: ┤ Ry├
          └───┘
      """
    Then 状態ベクトルは:
      """
      sqrt(2)/2|0> + sqrt(2)/2|1>
      """

  Scenario: 旧式の横長な Ry 箱はサポートしない
    When 次の回路を読み込もうとする:
      """
          ┌─────────┐
      q0: ┤ Ry(π/2) ├
          └─────────┘
      """
    Then 読み込みエラー:
      """
      ASCII parser angled gates require a dedicated angle line above the box
      """
