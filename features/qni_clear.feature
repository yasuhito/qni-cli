# language: ja
機能: qni clear コマンド
  qni-cli のユーザとして
  回路を最初から作り直せるようにするために
  qni clear を実行したい

  シナリオ: qni clear は既存の circuit.json を削除する
    前提 "qni add H --qubit 0 --step 0" を実行
    もし "qni clear" を実行
    ならば コマンドは成功
    かつ "circuit.json" は存在しない

  シナリオ: qni clear の標準出力は空
    前提 "qni add H --qubit 0 --step 0" を実行
    もし "qni clear" を実行
    ならば 標準出力は空

  シナリオ: qni clear は circuit.json がなくても成功
    もし "qni clear" を実行
    ならば コマンドは成功
    かつ "circuit.json" は存在しない
