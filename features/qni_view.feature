# language: ja
機能: qni view コマンド
  qni-cli のユーザとして
  量子回路の内容を確認するために
  qni view でアスキーアートな回路図を表示したい

  シナリオ: qni view コマンドは成功
    前提 "qni add H --qubit 0 --step 0" を実行
    もし "qni view" を実行
    ならば コマンドは成功

  シナリオ: qni view は H ゲートを表示
    前提 "qni add H --qubit 0 --step 0" を実行
    もし "qni view" を実行
    ならば 標準出力:
      """
      q0: --H--
      """

  シナリオ: qni view は X ゲートを表示
    前提 "qni add X --qubit 0 --step 0" を実行
    もし "qni view" を実行
    ならば 標準出力:
      """
      q0: --X--
      """

  シナリオ: qni view は Y ゲートを表示
    前提 "qni add Y --qubit 0 --step 0" を実行
    もし "qni view" を実行
    ならば 標準出力:
      """
      q0: --Y--
      """

  シナリオ: qni view は Z ゲートを表示
    前提 "qni add Z --qubit 0 --step 0" を実行
    もし "qni view" を実行
    ならば 標準出力:
      """
      q0: --Z--
      """

  シナリオ: 同じ step の 2 qubit に H がある回路を表示
    前提 "qni add H --qubit 0 --step 0" を実行
    かつ "qni add H --qubit 1 --step 0" を実行
    もし "qni view" を実行
    ならば 標準出力:
      """
      q0: --H--
      q1: --H--
      """

  シナリオ: 回路 json がないとき qni view はエラーメッセージを出して失敗
    もし "qni view" を実行
    ならば コマンドは失敗
    かつ 標準エラー:
      """
      circuit.json does not exist
      """
