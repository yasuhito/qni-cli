# qni コマンド仕様

ここにあるコマンドとオプションは、ヘルプを確認せずに使う。表にないものが必要な場合だけ、対応する `qni COMMAND --help` を実行する。

## コマンドとオプション

| コマンド | ゲート、引数、オプション |
| --- | --- |
| `qni add` | `H`, `X`, `Y`, `Z`, `S`, `S†`, `T`, `T†`, `√X`, `P`, `Rx`, `Ry`, `Rz`, `GlobalPhase`, `SWAP`, `Measure`, `--qubit`, `--step`, `--control`, `--angle`, `--name`, `--if` |
| `qni run` | `--symbolic`, `--basis`, `--shots`, `--seed`, `--json`, `--latex` |
| `qni state set` | — |
| `qni view` | — |
| `qni expect` | `--same-axis-correlations`, `--shots`, `--seed`, `--threshold`, `--json`, `--latex` |
| `qni export` | `--svg`, `--png`, `--latex-source`, `--state-vector`, `--circle-notation`, `--dark`, `--light`, `--no-transparent`, `--caption`, `--caption-tex`, `--caption-position`, `--caption-size`, `--output` |

## add

```text
qni add GATE --qubit N --step N
qni add GATE --control N[,N...] --qubit N --step N
qni add ANGLED_GATE --angle ANGLE --qubit N --step N
qni add SWAP --qubit N,N --step N
qni add Measure --name NAME --qubit N --step N
```

- 量子ビットとステップは 0 始まり。
- 角度付きゲートは `P`、`Rx`、`Ry`、`Rz`、`GlobalPhase`。角度には `π/3` や `pi/3` を使える。
- CNOT は `X` に制御量子ビットを指定する。複数の制御量子ビットはコンマで区切る。
- `SWAP` は対象量子ビットを2つ指定する。
- `Measure` に名前を付けると、その結果を古典条件で参照できる。量子ゲートに古典条件を指定すると、指定した測定結果が1の場合だけ実行する。

```text
qni add H --qubit 0 --step 0
qni add X --control 0 --qubit 1 --step 1
qni add P --angle π/2 --qubit 1 --step 2
qni add Measure --name input --qubit 0 --step 3
qni add X --if input --qubit 1 --step 4
```

## run

引数なしでは数値の状態ベクトルを表示する。記号的な ket には `--symbolic`、名前付き基底には `--symbolic --basis x|y|bell`、LaTeX の ket には `--latex` を使う。測定回路の分布にはショット数を指定する。再現が必要なら seed も指定し、機械処理には JSON を選ぶ。

```text
qni run --symbolic
qni run --symbolic --basis bell
qni run --latex
qni run --shots 1000 --seed 42 --json
```

`--latex` は測定を含む回路では使えない。測定直前の ket が必要なら、`Measure` を追加する前に実行する。

## state set

初期状態を ket 文字列で設定する。1量子ビットの短縮表記、計算基底、Bell 状態、それらの線形結合を使える。

```text
qni state set "|+>"
qni state set "|100>"
qni state set "alpha|Φ+> + beta|Ψ->"
```

## view

現在の回路を ASCII 図で表示する。

```text
qni view
```

## expect

Pauli 文字列の文字は左から `q0`、`q1`、…に対応する。厳密な期待値、有限ショットによる推定、JSON、LaTeX を選べる。

```text
qni expect Z
qni expect ZZ XX
qni expect ZZ XX --shots 1000 --seed 42
qni expect ZZ XX --json
qni expect ZZ XX --latex
qni expect --same-axis-correlations 2
```

## export

SVG は LaTeX 環境なしで標準出力へ書ける。PNG には出力先が必要で、`pdflatex` と `pdftocairo` も必要になる。LaTeX ソースは標準出力またはファイルへ書ける。

```text
qni export --svg
qni export --svg --output circuit.svg
qni export --png --output circuit.png
qni export --latex-source --output circuit.tex
```
