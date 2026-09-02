# qni-cli コマンドリファレンス

この文書は、汎用の `qni` コマンドを実用例で確認するためのリファレンスです。ベンチマーク採点と研究試行ログの詳しい手順は [benchmark.md](benchmark.md) に置きます。モデル別コストベンチマークの `qni research solve` と `qni research plot` は [model-cost-benchmark.md](model-cost-benchmark.md) を参照してください。

実行例では、インストール済みの CLI として `qni` を使います。リポジトリ内で開発中の実装を直接使う場合は、先に `npm run build` を実行し、`qni` を `node dist/bin/qni.js` に読み替えてください。

`qni` は常に現在の作業ディレクトリの `./circuit.json` を読み書きします。`qni add` は、ファイルが存在しない場合に、指定したゲートを置ける最小の回路を作ります。たとえば `--qubit 3` を指定すると、量子ビット番号を維持した q0〜q3 の4量子ビット回路を作ります。

## 回路を作る

```bash
qni add H --qubit 0 --step 0
qni add X --control 0 --qubit 1 --step 1
qni add Rx --angle π/2 --qubit 0 --step 2
qni add SWAP --qubit 0,1 --step 3
qni add Measure --qubit 0 --step 4
qni add Measure --name input --qubit 0 --step 5
qni add X --if input --qubit 0 --step 6
```

`Measure` は量子ビットを計算基底で測定します。`--name input` を付けると、結果を名前付き古典ビットへ保存し、Qni と互換性のある `Measure>input` として回路へ記録します。名前を省略した測定は `Measure` として保存され、古典条件からは参照できません。

量子ゲートに `--if input` を付けると、`input` が 1 の場合だけゲートを実行します。この例の `X` は Qni と互換性のある `X<input` として保存されます。`--if` は `SWAP` と角度付きゲートを含む、qni-cli が対応するすべての量子ゲートで同じように使えます。古典ビットは参照より前のステップで名前付き測定により定義する必要があります。同じ名前への複数の測定も実行エラーになります。

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

端末のフォントや描画環境によって `qni view` の ASCII 表示がずれて見える場合があります。LaTeX なしで安定した図が必要な場合は `qni export --svg` を使ってください。

## 量子ビットと列の順序

回路図では、上から `q0`、`q1`、… の順に量子ビットを置き、ステップは左から右へ進みます。ket のビット列は左から `q0`、`q1`、… に対応します。たとえば、2量子ビット回路で `|10⟩` は `q0=1`、`q1=0` を表します。

測定の表と JSON では、`classicalBits` は測定操作を実行した順に列名を並べます。`values` はビット列の位置ではなく、`classicalBits` の列名をキーとして値を参照します。これは回路図の量子ビット順とは別の順序です。

## 初期状態を管理する

```bash
qni state set "alpha|0> + beta|1>"
qni state set "|+>"
qni state set "|100>"
qni state set "|Φ+>"
qni state set "alpha|Φ+> + beta|Ψ->"
qni state show
qni state clear
```

`qni state set` は、1量子ビットの短縮表記、多量子ビットの計算基底状態、Bell 状態、計算基底または Bell 基底上の線形結合を初期状態として設定します。状態を戻したい場合は `qni state clear` を使います。

## 状態ベクトルと期待値を確認する

```bash
qni run
qni run --latex
qni run --symbolic
qni run --symbolic --latex
qni run --symbolic --basis x --latex
qni run --symbolic --basis bell
qni expect ZZ XX
qni expect --same-axis-correlations 2
qni expect ZZZ --same-axis-correlations 1
qni expect ZZ XX --shots 1000 --seed 42
qni expect ZX --shots 1000 --threshold 0.05
qni expect ZZ XX --shots 1000 --seed 42 --json
qni expect ZZ XX --json
qni expect ZZ XX --latex
```

`qni run` は、測定のない回路では状態ベクトルを表示します。`--symbolic` を付けると、小さな回路を ket 表記で読みやすく表示できます。制御付きの1量子ビットゲートは、`P`、`Rz`、`S`、`T` など、通常のシンボリック実行で扱えるゲートに対応します。複数制御と SWAP も扱えます。`--latex` を付けると、シンボリック実行が扱える回路では `\frac{\sqrt{2}}{2}` などの厳密な振幅を `\ket{}` 記法の LaTeX で表示します。先に数値実行と同じ入力検証を行うため、未束縛変数や非正規化の初期状態は通常の `qni run` と同じエラーになります。記号実行環境を順に試し、利用できない場合または回路が未対応の場合は TypeScript で生成した丸め済みの数値表示へ戻ります。数値フォールバックの生成自体には Python を使いません。`qni expect` は Pauli 文字列の期待値を計算し、`--latex` を付けると `\langle ZZ \rangle = 1.0` の形式で表示します。Pauli 文字列は左端から `q0`、`q1`、… に対応します。たとえば `XI` は `q0` に `X`、`q1` に `I` を適用します。

`qni expect --same-axis-correlations K` は、X、Y、Z の順に、ちょうど K 個の位置が同じ軸で残りが `I` の Pauli 文字列を列挙します。各軸内では位置の組合せ順です。3量子ビットの `K=2` なら `XXI`、`XIX`、`IXX`、`YYI`、`YIY`、`IYY`、`ZZI`、`ZIZ`、`IZZ` を出力します。K は1以上かつ回路の量子ビット数以下の整数です。オプションを繰り返すと指定順に列挙し、明示した Pauli 文字列がある場合はその入力順の後に列挙分を続けます。通常出力、`--json`、`--latex`、有限ショット推定のすべてで利用できます。

`qni expect --shots N` は、測定のない回路の終状態から Pauli 期待値を有限ショットで推定します。量子ビットごとに同じ軸または `I` を持つ Pauli 文字列は同じ測定設定にまとめ、設定ごとに N 回測定します。通常出力には厳密な期待値、推定値、標準誤差 `sqrt((1 − m²) / N)`、測定設定数、seed を表示します。`--seed` を省略すると 0 以上 4294967295 以下の整数を生成して表示します。表示された seed を同じ回路、Pauli 文字列、ショット数で指定すると出力全体を再現できます。

有限ショットでは、既定で推定値の絶対値が標準誤差の2倍以下なら `unstable` と表示します。`--threshold 0.05` を指定すると、推定値の絶対値が指定値以下かどうかで判定します。`--shots` なしでも `--threshold` を指定でき、その場合は厳密な期待値を判定します。ショット数は正の整数、しきい値は 0 以上 1 以下です。`--seed` は `--shots` と一緒に指定します。

`qni expect --json` は、入力した各 Pauli 文字列を大文字に正規化し、入力順と重複を保った `expectations` 配列を返します。各要素の `value` は数値の期待値、`sign` はその符号を表す `-1`、`0`、`1` のいずれかです。`--shots` と併用すると、`shots`、`seed`、判定条件を示す `criterion`、測定設定を示す `settings`、各期待値の `estimate` を追加します。

```json
{
  "expectations": [
    {
      "pauli": "ZZ",
      "value": 1,
      "sign": 1
    },
    {
      "pauli": "XX",
      "value": 1,
      "sign": 1
    }
  ]
}
```

`qni expect` の `--latex` は `--shots`、`--seed`、`--threshold`、`--json` と併用できません。`qni run --latex` は、一意な状態ベクトルを1つの ket として表示するため、`Measure` を含む回路では使えません。測定すると状態が確率的に分岐・収縮し、単一の ket として一意に表示できないためです。測定直前の状態を確認する場合は、`Measure` を追加する前の回路で `qni run --latex` を実行してください。`qni run --latex` は `--shots`、`--seed`、`--json` とも併用できません。

`Measure` を含む回路では、`qni run` は回路を1回実行します。名前付き測定は `input=0`、名前なし測定は `q0=0` の形式で表示します。測定は確率に従って状態を収縮させ、古典ビットの保存と条件付きゲートを含む後続の操作は回路のステップ順に評価します。測定回路では状態ベクトルを一意に表示できないため、`--symbolic` と `--basis` は使えません。

### 測定の共同分布を得る

まず `--shots` で回路を初期状態から独立に複数回実行します。通常出力の1行目は `shots=N seed=S`、2行目以降は回路内の名前付き測定と名前なし測定を列にした共同分布です。

```bash
qni run --shots 100
```

次に `--seed` で疑似乱数を固定すると、同じ回路、測定ショット数、シード値から標準出力全体を再現できます。シード値を省略すると、qni が 0 以上 4294967295 以下の整数を生成し、出力に含めます。測定ショット数は正の整数です。

```bash
qni run --shots 100 --seed 42
```

機械処理には `--json` を加えます。JSON は `shots`、使用した整数のシード値を示す `seed`、`classicalBits`、結果ごとの `values` と `count` を返します。`values` は文字列のビット順ではなく、`classicalBits` の各名前をキーにして値を参照できます。

```bash
qni run --shots 100 --seed 42 --json
```

名前なし測定の列名は量子ビットに対応する `qN` です。同じ列名が一つの回路内に再登場した場合は、2回目から `#2`、`#3` を付け、すべての測定を共同分布に残します。`--shots`、`--seed`、`--json` は測定を含む回路で使います。`--shots` を省略して `--seed` または `--json` を指定した場合は、ショット数を1として同じ形式で出力します。

### 超密度符号化を端から端まで試す

[超密度符号化の例](../examples/superdense-coding/README.md) では、回路内のランダム入力生成から Bell 対、古典条件付き符号化、復号、最終測定までを実行します。固定シードの通常出力と JSON 出力で入力と復号結果を比較し、測定と古典制御を含む PNG 回路図も生成できます。

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

次の例は、リポジトリルートから実行します。

```bash
qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni
```

`qni benchmark run` は、`.qni` 提出物をベンチマーク課題ファイルに照らして採点します。スモークセットの一括実行、JSON 出力、研究試行ログの保存手順は [benchmark.md](benchmark.md) を参照してください。

## 回路図を SVG で出力する

```bash
qni export --svg --light --output circuit.svg
```

`qni export --svg` は SVG の基本図形で回路図を直接描くため、LaTeX 処理系は不要です。`--output` を省略すると SVG を標準出力へ書き出します。既定のダークテーマでは白、`--light` では黒の回路線を使います。

ワイヤ、ゲート、複数の制御点と制御線、CNOT の標的、SWAP、測定器に対応します。角度、`†`、`√`、測定名、古典条件も文字として描きます。`--caption-size` の単位は pt です。`--caption` と `--caption-position top|bottom` を指定すると、キャプション全体が収まるように表示領域を広げます。

## 回路図を PNG で出力する

```bash
qni export --png --light --output circuit.png
```

回路図は quantikz 形式の LaTeX を `pdflatex` で組版します。`qni export --latex-source` では同じ LaTeX ソースを出力できます。

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

`qni export --svg` には外部コマンドは不要です。`qni export --png` と `qni export --state-vector --png` には、外部コマンドとして `pdflatex` と `pdftocairo` が必要です。
