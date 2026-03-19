# language: ja
機能: Quantum Katas BasicGates Task 1.4 AmplitudeChange
  Task 1.4 AmplitudeChange: |0⟩ を cos(alpha)|0⟩ + sin(alpha)|1⟩ に変える
  入力:
  角度 alpha
  1 量子ビットの状態 β|0⟩ + γ|1⟩
  目標:
  |0⟩ を cos(alpha)|0⟩ + sin(alpha)|1⟩ に変え、
  |1⟩ を -sin(alpha)|0⟩ + cos(alpha)|1⟩ に変える

  シナリオ: Task 1.4 は dumpAlpha = π/3 で非自明状態を変換する
    前提 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    かつ "qni add Ry --angle 2π/3 --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      -0.3928203230275509,0.9196152422706633
      """

  シナリオアウトライン: Task 1.4 の controlled 検証回路は alpha を走査して control qubit を |0> に戻す
    前提 空の 2 qubit 回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    かつ "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    かつ "qni add Ry --angle 2*alpha --control 0 --qubit 1 --step 2" を実行
    かつ "qni variable set alpha <alpha>" を実行
    かつ "qni add Ry --angle -2*alpha --control 0 --qubit 1 --step 3" を実行
    かつ "qni add H --qubit 0 --step 4" を実行
    もし "qni expect ZI" を実行
    ならば 期待値 "ZI" は 1.0 ± 1e-12

    例:
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

  シナリオ: Task 1.4 は symbolic 表示で一般式を示す
    前提 "qni add Ry --angle 2*alpha --qubit 0 --step 0" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      cos(alpha)|0> + sin(alpha)|1>
      """
