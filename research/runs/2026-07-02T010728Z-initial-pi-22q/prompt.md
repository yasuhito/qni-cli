# 初回 Qni CoResearcher 研究試行プロンプト

`benchmarks/prompts/qni-solution.md` の回答ルールに従い、`benchmarks/quantum-katas/` 配下の22問すべてについて `.qni` 提出物を作成してください。

制約:

- 各提出物は、対応する課題ファイルの `allowed_commands` だけを使う。
- 各提出物は、1行に1つの完全な `qni` コマンドを書く。
- 検証コマンド (`qni run`, `qni expect`) は提出物に含めない。
- 標準解ディレクトリ `benchmarks/solutions/` は参照しない。
- 生成先は `tmp/research-initial-pi/submissions/quantum-katas/...` とする。

対象ベンチマーク:

- `benchmarks/quantum-katas/basic-gates/*.md`
- `benchmarks/quantum-katas/superposition/*.md`
