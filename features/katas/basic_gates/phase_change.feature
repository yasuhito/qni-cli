Feature: Quantum Katas BasicGates Task 1.6 PhaseChange
  Task 1.6 PhaseChange: |1⟩ 成分に一般角の位相を掛ける
  入力:
  角度 alpha
  1 量子ビットの状態 β|0⟩ + γ|1⟩
  目標:
  |0⟩ はそのままにし、|1⟩ を exp(i*alpha)|1⟩ に変える

  Scenario: Task 1.6 は dumpAlpha = 5π/9 で非自明状態を変換する
    Given 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    And "qni add P --angle 5π/9 --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.6,-0.13891854213354424+0.7878462024097664i
      """

  Scenario Outline: Task 1.6 の controlled 検証回路は alpha を走査して control qubit を |0> に戻す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    And "qni add P --angle alpha --control 0 --qubit 1 --step 2" を実行
    And "qni variable set alpha <alpha>" を実行
    And "qni add P --angle=-alpha --control 0 --qubit 1 --step 3" を実行
    And "qni add H --qubit 0 --step 4" を実行
    When "qni expect ZI" を実行
    Then 期待値 "ZI" は 1.0 ± 1e-12

    Examples:
      | alpha  |
      | 0      |
      | π/18   |
      | 2π/18  |
      | 3π/18  |
      | 4π/18  |
      | 5π/18  |
      | 6π/18  |
      | 7π/18  |
      | 8π/18  |
      | π/2    |
      | 10π/18 |
      | 11π/18 |
      | 12π/18 |
      | 13π/18 |
      | 14π/18 |
      | 15π/18 |
      | 16π/18 |
      | 17π/18 |
      | π      |
      | 19π/18 |
      | 20π/18 |
      | 21π/18 |
      | 22π/18 |
      | 23π/18 |
      | 24π/18 |
      | 25π/18 |
      | 26π/18 |
      | 3π/2   |
      | 28π/18 |
      | 29π/18 |
      | 30π/18 |
      | 31π/18 |
      | 32π/18 |
      | 33π/18 |
      | 34π/18 |
      | 35π/18 |
      | 2π     |

  Scenario: Task 1.6 は symbolic 表示で一般式を示す
    Given 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    And "qni add P --angle alpha --qubit 0 --step 1" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      0.600000000000000|0> + 0.8*exp(I*alpha)|1>
      """
