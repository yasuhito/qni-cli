---
name: qni-cli
description: Build, run, measure, visualize, verify, and explain quantum circuits with the bundled qni CLI. Use for quantum-circuit tasks, including Quantum Katas, superdense coding, state vectors, expectation values, circuit diagrams, and Bloch-sphere images.
license: MIT
compatibility: Requires Node.js 22 or later. PNG export also requires pdflatex and pdftocairo; symbolic output and Bloch-sphere rendering require Python helpers.
---

# qni CLI

qni-cli を実行するときは、専用の `qni` ツールを優先する。`args` に引数の文字列配列を渡す。たとえば `qni run --latex` は `{"args":["run","--latex"]}` として呼ぶ。専用ツールがない環境では、このスキルの `scripts/qni` を絶対パスで実行する。ラッパーは同じパッケージの TypeScript CLI を使うため、リポジトリを探したり、全体にインストールされた `qni` に依存したりしない。

`qni` は作業ディレクトリの `./circuit.json` を読み書きする。利用者が作業場所を選んでいなければ、一時ディレクトリを使う。

## 基本手順

1. `qni add ...` で回路を作る。初期状態が必要な場合だけ、先に `qni state set "..."` を実行する。
2. `qni view` で回路を確認する。
3. `qni run` で実行する。説明用の ket 状態には `--symbolic`、再現可能な測定データには `--shots N --seed N --json` を使う。
4. 測定値、`qni expect ...`、またはその両方で結果を検証する。根拠と要求が一致しなければ、回路を直して再実行する。
5. 図が役立つ場合は、`qni export --png ...` で回路を描くか、`qni bloch --png --trajectory ...` で 1 量子ビットの軌跡を描く。
6. ゲート列を説明し、実行結果または検証結果を引用する。観測結果と理論上の期待を区別する。状態ベクトルや期待値を説明するときは、対応するコマンドへ `--latex` を付け、`--latex` の出力を `$$...$$` でそのまま引用する。数式は `$...$` または `$$...$$` で囲み、量子状態は `\ket{}` で書く。

最新のコマンド仕様は `qni --help` と `qni COMMAND --help` で確認する。専用ツールでは `["--help"]` または `["COMMAND", "--help"]` を `args` に渡す。

## 参考資料

必要なものだけを開く。

- 測定、検証、可視化、状態ベクトル: [references/recipes.md](references/recipes.md)
- 超密度符号化の一連の例: [references/superdense-coding.md](references/superdense-coding.md)
