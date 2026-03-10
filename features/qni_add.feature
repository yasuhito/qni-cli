# language: ja
機能: qni add コマンド
  qni-cli のユーザとして
  コマンドラインから量子回路を更新するために
  qni add コマンドを実行したい

  シナリオ: qni add コマンドは成功
    もし "qni add H --qubit 0 --step 0" を実行
    ならば コマンドは成功

  シナリオ: qni add H の標準出力は空
    もし "qni add H --qubit 0 --step 0" を実行
    ならば 標準出力は空

  シナリオ: すでに H があるスロットへの qni add は失敗
    前提 "qni add H --qubit 0 --step 0" を実行
    もし "qni add H --qubit 0 --step 0" を実行
    ならば コマンドは失敗

  シナリオ: 空の先頭ステップは自動的に削除される
    もし "qni add H --qubit 0 --step 1" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["H"]
        ]
      }
      """

  シナリオ: 空の先頭 qubit は自動的に削除される
    もし "qni add H --qubit 1 --step 0" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["H"]
        ]
      }
      """

  シナリオ: 既存回路に新しい qubit を追加できる
    前提 "qni add H --qubit 0 --step 0" を実行
    もし "qni add H --qubit 1 --step 0" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 2,
        "cols": [
          ["H", "H"]
        ]
      }
      """
