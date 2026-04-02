# qni-cli

`qni-cli` は、量子回路を表す `./circuit.json` をコマンドラインから編集し、表示し、シミュレーションし、画像として書き出すための Ruby 製 CLI です。

## できること

- `qni add` でゲートを追加する
- `qni view` で回路を ASCII アート表示する
- `qni run` で状態ベクトルを確認する
- `qni run --symbolic` で小さな回路の ket 表現を確認する
- `qni expect` で Pauli 文字列の期待値を計算する
- `qni export --png` で回路図を PNG に書き出す
- `qni export --state-vector --png` で symbolic state vector を PNG に書き出す
- `qni export --circle-notation --png` で最終状態を円表示で PNG に書き出す
- `qni bloch --png` / `--apng` / `--inline` で 1 qubit 状態を Bloch sphere として表示する

## セットアップ

### 1. Bundler で依存関係を入れる

```bash
bundle install
```

### 2. 画像出力や symbolic 実行に使う Python 環境を用意する

`qni run --symbolic`、`qni bloch`、`qni export --circle-notation --png` を使う場合は次を実行します。

```bash
scripts/setup_symbolic_python.sh
```

### 3. 回路 PNG を書き出す外部コマンドを入れる

`qni export --png` と `qni export --state-vector --png` には次が必要です。

- `pdflatex`
- `pdftocairo`

## クイックスタート

このリポジトリでは、ローカルの実装を使うために `bundle exec bin/qni` で実行します。

```bash
bundle exec bin/qni add H --qubit 0 --step 0
bundle exec bin/qni add X --control 0 --qubit 1 --step 1
bundle exec bin/qni view
bundle exec bin/qni run --symbolic --basis bell
```

`qni` はカレントディレクトリの `./circuit.json` を読み書きします。ファイルがなければ、ゲートを置ける最小の回路を自動で作成します。

## よく使うコマンド

### 回路を作る

```bash
bundle exec bin/qni add H --qubit 0 --step 0
bundle exec bin/qni add X --control 0 --qubit 1 --step 1
bundle exec bin/qni add Rx --angle π/2 --qubit 0 --step 2
bundle exec bin/qni add SWAP --qubit 0,1 --step 3
```

- `step` と `qubit` は 0-based です
- 対応ゲートは `H`, `X`, `Y`, `Z`, `S`, `S†`, `T`, `T†`, `√X`, `P`, `Rx`, `Ry`, `Rz`, `SWAP` です

### 回路を見る

```bash
bundle exec bin/qni view
```

### 初期状態を扱う

```bash
bundle exec bin/qni state set "alpha|0> + beta|1>"
bundle exec bin/qni state show
bundle exec bin/qni state clear
```

### 状態ベクトルと期待値を見る

```bash
bundle exec bin/qni run
bundle exec bin/qni run --symbolic
bundle exec bin/qni run --symbolic --basis x
bundle exec bin/qni expect ZZ XX
```

## 画像として export する

ASCII アートの代わりに画像として見たいときは `export` と `bloch` が使えます。

### 回路図を PNG にする

```bash
bundle exec bin/qni export --png --light --output circuit.png
```

### symbolic state vector を PNG にする

```bash
bundle exec bin/qni export --state-vector --png --light --output state.png
```

### 最終状態を circle notation で PNG にする

```bash
bundle exec bin/qni export --circle-notation --png --light --output circles.png
```

### 1 qubit 状態を Bloch sphere として出力する

```bash
bundle exec bin/qni bloch --png --trajectory --light --output bloch.png
bundle exec bin/qni bloch --apng --light --output bloch.png
bundle exec bin/qni bloch --inline
```

`qni bloch` は、現時点では「数値的に解決できる 1 qubit 回路」のみを対象にしています。

## 開発

全チェック:

```bash
bundle exec rake check
```

個別実行:

```bash
bundle exec rake cucumber
bundle exec rake rubocop
bundle exec rake flog
bundle exec rake flay
bundle exec rake reek
```

## 補足

- `qni view` はターミナルや表示環境によって文字の見え方がずれることがあります
- 位置ずれを避けたいときは `qni export --png` で回路図を PNG にするのが確実です
- 詳細な仕様は `SPEC.md` を参照してください
