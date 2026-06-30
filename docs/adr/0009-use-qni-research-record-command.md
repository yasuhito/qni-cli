# 研究試行ログ作成コマンドは qni research record にする

研究試行ログの初期機能では、ログ作成コマンド名を `qni research record` にする。`benchmark` は採点機能、`research` は共同研究者との研究ログ機能として分ける。

この判断により、将来 `qni research list`、`qni research report`、`qni research compare` へ自然に拡張できる。`record` の対象は、1つのベンチマークスイートに対する1回の研究試行である。
