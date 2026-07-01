# qni-cli コマンドリファレンス

この文書は、汎用の `qni` コマンドを実用例で確認するためのリファレンスです。ベンチマーク採点と研究試行ログの詳しい手順は [benchmark.md](benchmark.md) に置きます。

実行例では、インストール済みの CLI として `qni` を使います。リポジトリ内で開発中の実装を直接使う場合は、先に `npm run build` を実行し、`qni` を `node dist/bin/qni.js` に読み替えてください。

`qni` は常に現在の作業ディレクトリの `./circuit.json` を読み書きします。`qni add` は、ファイルが存在しない場合に、指定したゲートを置ける最小の回路を作ります。

## 回路を作る

```bash
qni add H --qubit 0 --step 0
qni add X --control 0 --qubit 1 --step 1
qni add Rx --angle π/2 --qubit 0 --step 2
qni add SWAP --qubit 0,1 --step 3
```

`step` と `qubit` は 0 始まりです。主なゲートは `H`、`X`、`Y`、`Z`、`S`、`S†`、`T`、`T†`、`√X`、`P`、`Rx`、`Ry`、`Rz`、`SWAP` です。

## ゲートを読む

```bash
qni gate --qubit 0 --step 0
```

`qni gate` は、指定したスロットの `circuit.json` セル値を表示します。たとえば Hadamard ゲートのセルは `H` と表示されます。

## ゲートを削除する

```bash
qni rm --qubit 0 --step 0
```

`qni rm` は、指定したスロットにある操作を削除します。制御付きゲートでは制御側または対象側のどちらを指定しても操作全体を削除します。`SWAP` では、どちらかの `Swap` セルを指定すると両方のセルを削除します。

## 回路を表示する

```bash
qni view
```

端末のフォントや描画環境によって `qni view` の ASCII 表示がずれて見える場合があります。安定した図が必要な場合は `qni export --png` を使ってください。

## 初期状態を管理する

```bash
qni state set "alpha|0> + beta|1>"
qni state show
qni state clear
```

`qni state set` は、回路の初期状態を明示します。状態を戻したい場合は `qni state clear` を使います。

## 状態ベクトルと期待値を確認する

```bash
qni run
qni run --symbolic
qni run --symbolic --basis x
qni run --symbolic --basis bell
qni expect ZZ XX
```

`qni run` は状態ベクトルを表示します。`--symbolic` を付けると、小さな回路を ket 表記で読みやすく表示できます。`qni expect` は Pauli 文字列の期待値を計算します。

## 角度変数を使う

```bash
qni add Ry --angle theta --qubit 0 --step 0
qni variable set theta π/2
qni variable list
qni variable unset theta
qni variable clear
```

`Rx`、`Ry`、`Rz`、`P` などの角度付きゲートに記号を使う場合は、`qni variable` で値を管理します。`qni variable set` は既存の `circuit.json` に変数を保存するため、先に角度付きゲートを追加します。

## ベンチマーク提出物を採点する

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni
```

`qni benchmark run` は、`.qni` 提出物をベンチマーク課題ファイルに照らして採点します。スモークセットの一括実行、JSON 出力、研究試行ログの保存手順は [benchmark.md](benchmark.md) を参照してください。

## 回路図を PNG で出力する

```bash
qni export --png --light --output circuit.png
```

メモ、スライド、ドキュメントに載せる図にはキャプションを付けられます。暗いノートテーマなどで白背景を保ちたい場合は `--no-transparent` を使います。

```bash
qni export --png --light --no-transparent \
  --caption "CNOT before cut" \
  --caption-position bottom \
  --output circuit.png
```

## 状態ベクトル画像を出力する

```bash
qni export --state-vector --png --light --output state.png
```

## circle notation 画像を出力する

```bash
qni export --circle-notation --png --light --output circles.png
```

## Bloch sphere を出力する

```bash
qni bloch --png --trajectory --light --output bloch.png
qni bloch --apng --light --output bloch.png
qni bloch --inline
```

`qni bloch` は、現在は完全に数値化された 1-qubit 回路だけを対象にします。静止画で遷移を見たい場合は `--png --trajectory`、アニメーションが必要な場合は `--apng`、対応端末へ直接表示したい場合は `--inline` を使います。

## 画像出力の前提

記号計算や一部の画像出力には Python 環境が必要です。

```bash
scripts/setup_symbolic_python.sh
```

`qni export --png` と `qni export --state-vector --png` には、外部コマンドとして `pdflatex` と `pdftocairo` が必要です。
