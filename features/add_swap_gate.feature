# language: ja
機能: qni add SWAP コマンド
  qni-cli のユーザとして
  2 つの qubit を入れ替える回路を作るために
  qni add SWAP を実行したい

  シナリオ: qni add SWAP は circuit.json に Swap を 2 つ追加
    もし "qni add SWAP --qubit 0,1 --step 0" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 2,
        "cols": [
          ["Swap", "Swap"]
        ]
      }
      """

  シナリオ: qni add SWAP は target qubit が 1 つだと失敗
    もし "qni add SWAP --qubit 0 --step 0" を実行
    ならば コマンドは失敗
    かつ 標準エラー:
      """
      SWAP requires exactly 2 target qubits
      """

  シナリオ: qni add SWAP は target qubit が 3 つだと失敗
    もし "qni add SWAP --qubit 0,1,2 --step 0" を実行
    ならば コマンドは失敗
    かつ 標準エラー:
      """
      SWAP requires exactly 2 target qubits
      """

  シナリオ: qni add SWAP は --qubit がないと失敗
    もし "qni add SWAP --step 0" を実行
    ならば コマンドは失敗
    かつ 標準エラー:
      """
      No value provided for required options '--qubit'
      """
