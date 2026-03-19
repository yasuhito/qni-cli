# language: ja
機能: qni variable コマンド
  qni-cli のユーザとして
  角度変数を使って回路を再利用するために
  qni variable を実行したい

  シナリオ: qni variable set は circuit.json に変数を保存する
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    もし "qni variable set theta π/4" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Ry(theta)"]
        ],
        "variables": {
          "theta": "π/4"
        }
      }
      """

  シナリオ: qni variable list は変数を一覧表示する
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    かつ "qni variable set theta π/4" を実行
    かつ "qni variable set phi π/2" を実行
    もし "qni variable list" を実行
    ならば 標準出力:
      """
      phi=π/2
      theta=π/4
      """

  シナリオ: qni variable unset は指定した変数を削除する
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    かつ "qni variable set theta π/4" を実行
    もし "qni variable unset theta" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Ry(theta)"]
        ]
      }
      """

  シナリオ: qni variable clear はすべての変数を削除する
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    かつ "qni variable set theta π/4" を実行
    かつ "qni variable set phi π/2" を実行
    もし "qni variable clear" を実行
    ならば "circuit.json" の内容:
      """
      {
        "qubits": 1,
        "cols": [
          ["Ry(theta)"]
        ]
      }
      """

  シナリオ: qni variable set は circuit.json がないと失敗
    もし "qni variable set theta π/4" を実行
    ならば コマンドは失敗
    かつ 標準エラー:
      """
      circuit.json does not exist
      """
