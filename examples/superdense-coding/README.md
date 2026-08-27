# 超密度符号化

この例では、回路内でランダムな2ビットを生成し、Bell 対を使って送信し、受信側で復号します。`input_high` と `input_low` が入力、`output_high` と `output_low` が復号結果です。

## エージェントへの依頼文

> 超密度符号化回路を qni-cli で作り、ランダムに生成した入力2ビットと復号した出力2ビットが各ショットで一致することを確認してください。固定シードの通常出力と JSON 出力を示し、回路図を PNG で保存してください。回路のコマンド列には `examples/superdense-coding/circuit.qni` を使ってください。

## 回路を作る

`qni` をインストールした状態で、リポジトリのルートから実行します。回路ファイルと画像は一時ディレクトリに作ります。

```bash
commands=$(realpath examples/superdense-coding/circuit.qni)
workdir=$(mktemp -d)
cd "$workdir"
while read -r -a command; do
  "${command[@]}"
done < "$commands"
```

`circuit.qni` は次の順で回路を作ります。

1. q0 と q1 を重ね合わせて測定し、`input_high` と `input_low` を生成する。
2. q2 と q3 に Bell 対を準備する。
3. 入力に応じて、送信側の q2 に Z と X を適用する。
4. q2 と q3 に Bell 回路を逆順で適用する。
5. q2 と q3 を測定し、`output_high` と `output_low` を得る。

## 確認する

通常出力では、各行について入力2列と出力2列が一致することを確認します。seed 42 の16ショットでは、4種類の入力をすべて再現できます。

```bash
qni run --shots 16 --seed 42
```

JSON 出力では、各結果の `input_high` と `output_high`、`input_low` と `output_low` を比較します。

```bash
qni run --shots 16 --seed 42 --json
```

回路表示では、入力生成、Bell 対、条件付き符号化、逆 Bell 回路、最終測定を左から順に追えます。

```bash
qni view
```

測定名と古典条件を含む回路画像を qni-cli 自身で生成します。

```bash
qni export --png --light --output superdense-coding.png
```
