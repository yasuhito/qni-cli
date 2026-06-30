# 研究試行ディレクトリは構造化されたファイル群にする

`qni research record` の初期機能では、1つの研究試行を `research/runs/<timestamp>-<slug>/` 配下の構造化されたファイル群として保存する。最小構成は次のとおり。

```text
research/runs/2026-06-30-smoke-claude/
├── trial.md
├── metadata.json
├── prompt.md
├── response.md
├── submissions/
│   └── ...
└── result.json
```

各ファイルの責務は次のとおり。

- `trial.md`: 人間向けの研究試行要約。
- `metadata.json`: 共同研究者名、日時、ベンチマークスイート、状態などの機械処理向け情報。
- `prompt.md`: 外部共同研究者に渡したプロンプトのコピー。
- `response.md`: 外部共同研究者の回答のコピー。
- `submissions/`: `.qni` 提出物群のコピー。
- `result.json`: `qni benchmark run-all --json` 相当の採点結果。

この判断により、人間が読みやすい記録と後続の集計処理を両立する。単一の巨大JSONにはせず、研究に使った原文と採点結果をそれぞれ独立したファイルとして追跡できるようにする。
