# qni research record はファイルパス入力を受け取る

研究試行ログの初期機能では、`qni research record` は AI を呼び出さず、外部で作られたプロンプト、AI回答、提出物ディレクトリをファイルパスで受け取る。代表的な入力は、共同研究者名、ベンチマークスイートのディレクトリ、提出物ディレクトリ、プロンプトファイル、AI回答ファイル、任意の slug とする。

例:

```bash
qni research record \
  --collaborator claude-sonnet-4 \
  --benchmark benchmarks/quantum-katas \
  --submissions tmp/claude-submissions \
  --prompt tmp/prompt.md \
  --response tmp/response.md \
  --slug smoke-claude
```

この判断により、Pi、Claude、Codex、人間など、どの共同研究者で作った成果物でも同じ記録経路に載せられる。標準入力や対話UI、AI API 呼び出しは初期範囲から外す。
