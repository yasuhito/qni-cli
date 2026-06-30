# ベンチマーク課題は Markdown と YAML frontmatter で表す

量子回路AIエージェント評価の課題ファイルは Markdown 本文と YAML frontmatter で表す。本文はAIエージェントや人間が読む自然言語の課題文を担い、frontmatter は `id`、`title`、`source`、`difficulty`、`allowed_commands`、`checks` など評価ランナーが読む構造化情報を担う。

この判断により、課題文の読みやすさと機械採点の安定性を両立できる。標準解は課題ファイルに埋め込まず、`benchmarks/solutions/` に分離して、AIに見せる入力と答えが同居しないようにする。

