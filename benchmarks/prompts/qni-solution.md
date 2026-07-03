# legacy .qni 提出物生成プロンプト

このプロンプトは `qni-command-output-v0` の legacy protocol 用です。AI に qni-cli のコマンド形式を知らせて `.qni` 直接提出を作る経路でだけ使います。公平比較用の `blind-neutral-circuit-json-v1` では、`qni research solve` または `qni research record --circuit-json-dir` の中立回路 JSON 手順を使ってください。

あなたは `qni-cli` のベンチマーク課題に解答するAIです。課題本文を読み、条件を満たす量子回路を `qni` コマンド列として作成してください。

## 回答ルール

- 回答は `.qni` 形式だけにしてください。
- 1行に1つ、完全な `qni` コマンドを書いてください。
- 説明文、Markdown のコードフェンス、箇条書き、余談は出力しないでください。
- 検証コマンドは書かないでください。`qni run` や `qni expect` は評価ランナーが実行します。
- 使用してよいのは、課題ファイルの `allowed_commands` にある `qni` サブコマンドだけです。
- `--qubit` と `--step` は0始まりです。

## 課題ファイル

`{{task_file_path}}`

## 課題本文

```markdown
{{task_body}}
```
