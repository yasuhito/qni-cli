# metadata.json は最小項目から始める

`qni research record` の初期機能では、研究試行ディレクトリの `metadata.json` に、研究試行を識別して後続処理でたどるための最小項目だけを保存する。

初期スキーマは次の形にする。

```json
{
  "schemaVersion": 1,
  "id": "2026-06-30-smoke-claude",
  "createdAt": "2026-06-30T12:34:56.000Z",
  "collaborator": "claude-sonnet-4",
  "benchmark": "benchmarks/quantum-katas",
  "submissions": "submissions",
  "prompt": "prompt.md",
  "response": "response.md",
  "result": "result.json",
  "status": "passed"
}
```

この判断により、研究試行の保存形式を先に安定させつつ、モデル温度、host、リポジトリ commit、所要時間などの詳細な実験設定を後から追加できる。初期MVPでは、必要以上に実験管理システム化しない。
