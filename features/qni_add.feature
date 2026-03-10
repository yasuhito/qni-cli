# language: ja
機能: qni add コマンド
  qni-cli のユーザとして
  コマンドラインから量子回路を更新するために
  qni add コマンドを実行したい

  シナリオ: qni add コマンドは成功
    もし "qni add H --step 0 --qubit 0" を実行
    ならば コマンドは成功

  シナリオ: qni add H の標準出力は空
    もし "qni add H --step 0 --qubit 0" を実行
    ならば 標準出力は空

  シナリオ: すでに H があるスロットへの qni add は失敗
    前提 "qni add H --step 0 --qubit 0" を実行
    かつ "qni add H --step 0 --qubit 0" を実行
    ならば コマンドは失敗
