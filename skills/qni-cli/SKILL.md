---
name: qni-cli
description: Build, run, measure, visualize, verify, and explain quantum circuits with the bundled qni CLI. Use for quantum-circuit tasks, including Quantum Katas, superdense coding, state vectors, expectation values, circuit diagrams, and Bloch-sphere images. Also use for explaining quantum algorithms such as QFT (quantum Fourier transform), Grover, Shor, and quantum teleportation, and for unitary-matrix verification and state-vector calculation. 日本語では、量子アルゴリズムの解説、量子フーリエ変換、ユニタリ行列の検証、状態ベクトルの計算にも使う。
license: MIT
compatibility: Requires Node.js 22 or later. PNG export also requires pdflatex and pdftocairo; symbolic output and Bloch-sphere rendering require Python helpers.
---

# qni CLI

qni-cli を実行するときは、専用の `qni` ツールを優先する。単独のコマンドは `args` に引数の文字列配列を渡す。たとえば `qni run --latex` は `{"args":["run","--latex"]}` として呼ぶ。`add`、`view`、`run` のように依存するコマンド列は `commands` にまとめ、1回で一括実行する。途中で失敗したら修正して残りだけを呼び直す。成功分の変更は作業場所に残っている。利用者が作業場所を選んでいない場合は `workdir` を省略する。同じセッションの呼び出しは、専用ツールが用意した同じ一時作業場所を使う。利用者が作業場所を選んだ場合だけ `workdir` に Pi の作業場所からの相対パスを指定する。Pi の作業場所そのものは `"."` とする。

専用ツールがない環境では、このスキルの `scripts/qni` を絶対パスで実行する。ラッパーは同じパッケージの TypeScript CLI を使うため、リポジトリを探したり、全体にインストールされた `qni` に依存したりしない。`qni` は作業ディレクトリの `./circuit.json` を読み書きするため、利用者が作業場所を選んでいなければ、一時ディレクトリで実行する。

量子の行列、状態ベクトル、期待値を数値計算・検証するときは、NumPy などの使い捨てスクリプトではなく qni コマンド（必要なら `--latex`）を使う。

## 基本手順

1. `qni add ...` で回路を作る。初期状態が必要な場合だけ、先に `qni state set "..."` を実行する。
2. `qni view` で回路を確認する。
3. `qni run` で実行する。説明用の ket 状態には `--symbolic`、再現可能な測定データには `--shots N --seed N --json` を使う。
4. 測定値、`qni expect ...`、またはその両方で結果を検証する。根拠と要求が一致しなければ、回路を直して再実行する。
5. 回路を説明するときは、画像を表示できる端末では `qni export --png` で回路図を画像にして見せる。表示可否の判定と表示は pi-formula に任せ、画像を使えない場合だけ `qni view` の ASCII 回路図を見せる。Bloch 球が役立つ場合は `qni bloch --png --trajectory ...` で 1 量子ビットの軌跡を描く。
6. ゲート列を説明し、実行結果または検証結果を引用する。観測結果と理論上の期待を区別する。状態ベクトルや期待値を説明するときは、対応するコマンドへ `--latex` を付け、`--latex` の出力を `$$...$$` でそのまま引用する。数式は `$...$` または `$$...$$` で囲み、量子状態は `\ket{}` で書く。

最新のコマンド仕様は `qni --help` と `qni COMMAND --help` で確認する。専用ツールでは `["--help"]` または `["COMMAND", "--help"]` を `args` に渡す。

## 参考資料

必要なものだけを開く。

- 測定、検証、可視化、状態ベクトル: [references/recipes.md](references/recipes.md)
- 超密度符号化の一連の例: [references/superdense-coding.md](references/superdense-coding.md)
