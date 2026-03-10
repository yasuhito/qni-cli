# language: ja
機能: qni CLI
  qni-cli のユーザとして
  利用できるコマンドを知るために
  qni だけ実行してヘルプを見たい

  シナリオ: qni はコマンド一覧を表示
    もし "qni" を実行
    ならば コマンドは成功
    かつ 標準出力に次を含む:
      """
      qni commands:
      """
    かつ 標準出力に次を含む:
      """
      qni add GATE --qubit=N --step=N
      """
    かつ 標準出力に次を含む:
      """
      qni help [COMMAND]
      """
    かつ 標準出力に次を含む:
      """
      qni view
      """
    かつ 標準出力に次を含まない:
      """
      qni tree
      """
