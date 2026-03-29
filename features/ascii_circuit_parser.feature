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
