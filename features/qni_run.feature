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
