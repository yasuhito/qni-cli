# language: ja
機能: qni expect コマンド
  qni-cli のユーザとして
  Pauli 文字列の期待値を確認するために
  qni expect を実行したい

  シナリオ: qni expect コマンドは成功
    前提 "qni add H --qubit 0 --step 0" を実行
    かつ "qni add X --control 0 --qubit 1 --step 1" を実行
    もし "qni expect ZZ" を実行
    ならば コマンドは成功

  シナリオ: qni expect は Bell 状態の ZZ の期待値を標準出力に表示
    前提 "qni add H --qubit 0 --step 0" を実行
    かつ "qni add X --control 0 --qubit 1 --step 1" を実行
    もし "qni expect ZZ" を実行
    ならば 標準出力:
      """
      ZZ=1.0
      """

  シナリオ: qni expect は Bell 状態の XX の期待値を標準出力に表示
    前提 "qni add H --qubit 0 --step 0" を実行
    かつ "qni add X --control 0 --qubit 1 --step 1" を実行
    もし "qni expect XX" を実行
    ならば 標準出力:
      """
      XX=1.0
      """

  シナリオ: qni expect は複数の期待値を行ごとに標準出力に表示
    前提 "qni add H --qubit 0 --step 0" を実行
    かつ "qni add X --control 0 --qubit 1 --step 1" を実行
    もし "qni expect ZZ XX" を実行
    ならば 標準出力:
      """
      ZZ=1.0
      XX=1.0
      """

  シナリオ: qni expect は 3 qubit の Pauli 文字列の期待値を標準出力に表示
    前提 "qni add H --qubit 0 --step 0" を実行
    かつ "qni add X --control 0 --qubit 1 --step 1" を実行
    かつ "qni add X --control 0 --qubit 2 --step 2" を実行
    もし "qni expect ZZI IZZ XXX" を実行
    ならば 標準出力:
      """
      ZZI=1.0
      IZZ=1.0
      XXX=1.0
      """

  シナリオ: qni expect は変数 angle を解決して期待値を表示
    前提 "qni add H --qubit 0 --step 0" を実行
    かつ "qni add X --control 0 --qubit 1 --step 1" を実行
    かつ "qni add Ry --angle theta --qubit 0 --step 2" を実行
    かつ "qni variable set theta π/2" を実行
    もし "qni expect ZX XZ" を実行
    ならば 標準出力:
      """
      ZX=-1.0
      XZ=1.0
      """
