# trial.md は機械的な研究試行要約にする

`qni research record` の初期機能では、研究試行ディレクトリの `trial.md` を人間向けの浅い要約として生成する。AI回答の質的評価や独自解釈は行わず、共同研究者名、ベンチマークスイート、採点状態、課題数、合格数、失敗数、不許可数、エラー数、関連ファイルへのリンクを機械的に並べる。

例:

```md
# Research trial: smoke-claude

- collaborator: claude-sonnet-4
- benchmark: benchmarks/quantum-katas
- status: passed
- tasks: 3
- passed: 3
- failed: 0
- disallowed: 0
- error: 0

## Files

- Prompt: ./prompt.md
- Response: ./response.md
- Submissions: ./submissions/
- Result: ./result.json
```

この判断により、`trial.md` と `result.json` の意味がずれにくくなる。AI回答の質的評価、失敗理由の解釈、比較レポートは後続機能として扱う。
