# language: ja
機能: Quantum Katas BasicGates Task 1.4 AmplitudeChange
  Task 1.4 AmplitudeChange: |0⟩ を cos(alpha)|0⟩ + sin(alpha)|1⟩ に変える
  入力:
  角度 alpha
  1 量子ビットの状態 β|0⟩ + γ|1⟩
  目標:
  |0⟩ を cos(alpha)|0⟩ + sin(alpha)|1⟩ に変え、
  |1⟩ を -sin(alpha)|0⟩ + cos(alpha)|1⟩ に変える

  シナリオアウトライン: Task 1.4 は |0> に振幅変化を適用する
    前提 空の 1 qubit 回路がある
    かつ "qni add Ry --angle <double_alpha> --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      <state_vector>
      """

    例:
      | double_alpha | state_vector                    |
      | 0            | 1.0,0.0                         |
      | π/3          | 0.8660254037844387,0.5          |
      | π/2          | 0.7071067811865476,0.7071067811865475 |
      | π            | 6.123233995736766e-17,1.0       |

  シナリオ: Task 1.4 の controlled 検証回路は control qubit を |0> に戻す
    前提 空の 2 qubit 回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    かつ "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    かつ "qni add Ry --angle 2*alpha --control 0 --qubit 1 --step 2" を実行
    かつ "qni variable set alpha π/3" を実行
    かつ "qni add Ry --angle -2*alpha --control 0 --qubit 1 --step 3" を実行
    かつ "qni add H --qubit 0 --step 4" を実行
    もし "qni expect ZI" を実行
    ならば 標準出力:
      """
      ZI=1.0
      """

  シナリオ: Task 1.4 は symbolic 表示で一般式を示す
    前提 "qni add Ry --angle 2*alpha --qubit 0 --step 0" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      cos(alpha)|0> + sin(alpha)|1>
      """
