# language: ja
機能: qni run コマンド
  qni-cli のユーザとして
  量子回路の状態ベクトルを確認するために
  qni run を実行したい

  シナリオ: qni run コマンドは成功
    前提 "qni add H --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば コマンドは成功

  シナリオ: qni run は状態ベクトルを標準出力に表示
    前提 "qni add H --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865475,0.7071067811865475
      """

  シナリオ: qni run は何もゲートを適用しない |0> の状態ベクトルを標準出力に表示
    前提 空の 1 qubit 回路がある
    もし "qni run" を実行
    ならば 標準出力:
      """
      1.0,0.0
      """

  シナリオ: qni run は X ゲートの状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,1.0
      """

  シナリオ: qni run は Y ゲートの状態ベクトルを標準出力に表示
    前提 "qni add Y --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,1.0i
      """

  シナリオ: qni run は Z ゲートの状態ベクトルを標準出力に表示
    前提 "qni add Z --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      1.0,0.0
      """

  シナリオ: qni run は S ゲートの状態ベクトルを標準出力に表示
    前提 "qni add S --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      1.0,0.0
      """

  シナリオ: qni run は S† ゲートの状態ベクトルを標準出力に表示
    前提 "qni add S† --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      1.0,0.0
      """

  シナリオ: qni run は T ゲートの状態ベクトルを標準出力に表示
    前提 "qni add T --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      1.0,0.0
      """

  シナリオ: qni run は T† ゲートの状態ベクトルを標準出力に表示
    前提 "qni add T† --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      1.0,0.0
      """

  シナリオ: qni run は √X ゲートの状態ベクトルを標準出力に表示
    前提 "qni add √X --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.5+0.5i,0.5-0.5i
      """

  シナリオ: qni run は Phase ゲートの状態ベクトルを標準出力に表示
    前提 "qni add P --angle π/3 --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      1.0,0.0
      """

  シナリオ: qni run は Rx ゲートの状態ベクトルを標準出力に表示
    前提 "qni add Rx --angle π/2 --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865476,-0.7071067811865475i
      """

  シナリオ: qni run は Ry ゲートの状態ベクトルを標準出力に表示
    前提 "qni add Ry --angle π/2 --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865476,0.7071067811865475
      """

  シナリオ: qni run は変数 angle を解決して Ry ゲートの状態ベクトルを表示
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    かつ "qni variable set theta π/2" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865476,0.7071067811865475
      """

  シナリオ: qni run は未束縛の変数 angle があると失敗
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば コマンドは失敗
    かつ 標準エラー:
      """
      unresolved angle variable: theta
      """

  シナリオ: qni run は単純な角度式と変数を解決して Ry ゲートの状態ベクトルを表示
    前提 "qni add Ry --angle 2*alpha --qubit 0 --step 0" を実行
    かつ "qni variable set alpha π/4" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865476,0.7071067811865475
      """

  シナリオ: qni run は負の単純な角度式と変数を解決して Ry ゲートの状態ベクトルを表示
    前提 "qni add Ry --angle -2*alpha --qubit 0 --step 0" を実行
    かつ "qni variable set alpha π/4" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865476,-0.7071067811865475
      """

  シナリオ: qni run は Rz ゲートの状態ベクトルを標準出力に表示
    前提 "qni add Rz --angle π/2 --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865476-0.7071067811865475i,0.0
      """

  シナリオ: qni run は SWAP を |00> に適用した状態ベクトルを標準出力に表示
    前提 空の 2 qubit 回路がある
    かつ "qni add SWAP --qubit 0,1 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      1.0,0.0,0.0,0.0
      """

  シナリオ: qni run は SWAP を |01> に適用した状態ベクトルを標準出力に表示
    前提 2 qubit の初期状態が "|01>" である
    かつ "qni add SWAP --qubit 0,1 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,0.0,1.0,0.0
      """

  シナリオ: qni run は SWAP を |10> に適用した状態ベクトルを標準出力に表示
    前提 2 qubit の初期状態が "|10>" である
    かつ "qni add SWAP --qubit 0,1 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,1.0,0.0,0.0
      """

  シナリオ: qni run は SWAP を |11> に適用した状態ベクトルを標準出力に表示
    前提 2 qubit の初期状態が "|11>" である
    かつ "qni add SWAP --qubit 0,1 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,0.0,0.0,1.0
      """

  シナリオ: qni run は CNOT を |00> に適用した状態ベクトルを標準出力に表示
    前提 空の 2 qubit 回路がある
    かつ "qni add X --control 0 --qubit 1 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      1.0,0.0,0.0,0.0
      """

  シナリオ: qni run は CNOT を |01> に適用した状態ベクトルを標準出力に表示
    前提 2 qubit の初期状態が "|01>" である
    かつ "qni add X --control 0 --qubit 1 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,1.0,0.0,0.0
      """

  シナリオ: qni run は CNOT を |10> に適用した状態ベクトルを標準出力に表示
    前提 2 qubit の初期状態が "|10>" である
    かつ "qni add X --control 0 --qubit 1 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,0.0,0.0,1.0
      """

  シナリオ: qni run は CNOT を |11> に適用した状態ベクトルを標準出力に表示
    前提 2 qubit の初期状態が "|11>" である
    かつ "qni add X --control 0 --qubit 1 --step 2" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,0.0,1.0,0.0
      """

  シナリオ: qni run は |1> に H ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add H --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865475,-0.7071067811865475
      """

  シナリオ: qni run は |1> に X ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add X --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      1.0,0.0
      """

  シナリオ: qni run は |1> に Y ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add Y --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      -1.0i,0.0
      """

  シナリオ: qni run は |1> に Z ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add Z --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,-1.0
      """

  シナリオ: qni run は |1> に S ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add S --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,1.0i
      """

  シナリオ: qni run は |1> に S† ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add S† --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,-1.0i
      """

  シナリオ: qni run は |1> に T ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add T --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,0.7071067811865476+0.7071067811865475i
      """

  シナリオ: qni run は |1> に T† ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add T† --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,0.7071067811865476-0.7071067811865475i
      """

  シナリオ: qni run は |1> に √X ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add √X --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.5-0.5i,0.5+0.5i
      """

  シナリオ: qni run は |1> に Phase ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add P --angle π/3 --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,0.5000000000000001+0.8660254037844386i
      """

  シナリオ: qni run は |1> に Rx ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add Rx --angle π/2 --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      -0.7071067811865475i,0.7071067811865476
      """

  シナリオ: qni run は |1> に Ry ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add Ry --angle π/2 --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      -0.7071067811865475,0.7071067811865476
      """

  シナリオ: qni run は |1> に Rz ゲートを適用した状態ベクトルを標準出力に表示
    前提 "qni add X --qubit 0 --step 0" を実行
    かつ "qni add Rz --angle π/2 --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.0,0.7071067811865476+0.7071067811865475i
      """

  シナリオ: qni run --symbolic は H ゲートの状態を ket 形式で表示
    前提 "qni add H --qubit 0 --step 0" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      0.7071067811865475|0> + 0.7071067811865475|1>
      """

  シナリオ: qni run --symbolic は Y ゲートの純虚数係数を表示
    前提 "qni add Y --qubit 0 --step 0" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      1.0i|1>
      """

  シナリオ: qni run --symbolic は未束縛の角度変数を記号のまま表示
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      cos(theta/2)|0> + sin(theta/2)|1>
      """

  シナリオ: qni run --symbolic は単純な角度式を簡約して表示
    前提 "qni add Ry --angle 2*alpha --qubit 0 --step 0" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      cos(alpha)|0> + sin(alpha)|1>
      """

  シナリオ: qni run --symbolic は 2 qubit 回路では失敗
    前提 空の 2 qubit 回路がある
    もし "qni run --symbolic" を実行
    ならば コマンドは失敗
    かつ 標準エラー:
      """
      symbolic run currently supports only 1-qubit circuits
      """
