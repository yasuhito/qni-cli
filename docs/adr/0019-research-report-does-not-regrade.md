# 研究試行レポートは再採点しない

`qni research report` は、保存済みの `research/runs/<timestamp>-<slug>/` 配下の `metadata.json` と `result.json` を読み、研究試行の集計と一覧を作るだけにする。レポート作成時に再採点すると、研究試行が記録された時点の観測と現在の CLI による再評価が混ざってしまうため、過去の研究ログを比較する機能としての意味が曖昧になる。再採点が必要になった場合は、`qni research report` ではなく別の明示的な操作として扱う。
