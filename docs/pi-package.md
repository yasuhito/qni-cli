---
summary: '公開前の qni-cli tarball を CLI と Pi の両方で確認する手順'
read_when:
  - npm 公開前に qni-cli パッケージと同梱スキルを確認する時
---

# 公開前の npm / Pi パッケージ確認

この手順では npm へ公開しない。現在の作業木から tarball を作り、一時環境で確認する。

## tarball を作る

```bash
npm run check
pack_json=$(npm pack --json --pack-destination /tmp)
tarball=$(node -e 'const fs = require("node:fs"); const data = JSON.parse(fs.readFileSync(0, "utf8")); process.stdout.write(`/tmp/${data[0].filename}`)' <<<"$pack_json")
tar -tzf "$tarball"
```

一覧に `dist/`、`dist/qni-math/index.js`、`libexec/`、`benchmarks/`、`examples/superdense-coding/`、`skills/qni-cli/`、`LICENSE` があることを確認する。

## CLI をリポジトリ外から確認する

```bash
install_dir=$(mktemp -d)
workspace=$(mktemp -d)
npm install --prefix "$install_dir" "$tarball"
PATH="$install_dir/node_modules/.bin:$PATH"
cd "$workspace"
qni --help
qni add H --qubit 0 --step 0
qni run
```

超密度符号化も、同梱したコマンド列から実行する。

```bash
commands="$install_dir/node_modules/qni-cli/examples/superdense-coding/circuit.qni"
while read -r -a command; do
  "${command[@]}"
done < "$commands"
qni run --shots 16 --seed 42 --json
```

各結果で `input_high` と `output_high`、`input_low` と `output_low` が一致すれば成功である。

## Pi でスキルを確認する

Pi はディレクトリ形式のローカルパッケージを読み込むため、tarball を一時ディレクトリへ展開する。

```bash
package_dir=$(mktemp -d)
tar -xzf "$tarball" -C "$package_dir" --strip-components=1
pi install "$package_dir"
pi list
```

新しい一時作業ディレクトリで Pi を起動し、次のように依頼する。

> qni-cli でランダムな2ビットを送る超密度符号化回路を作り、16ショットを seed 42 で実行してください。入力と復号結果が毎回一致することを検証し、回路を表示して各段階を説明してください。

確認項目:

1. Pi が `qni-math` 拡張と `qni-cli` スキルを読み込む。
2. `/math status` が `qni-math` の版と `path: image (fixed)` を表示し、本文の `$...$`、`$$...$$`、`\\(...\\)`、`\\[...\\]` を Ghostty / Kitty の画像で描く。コードと thinking ブロックの数式は変換しない。
3. `QNI_MATH_PATH=text pi` で起動すると `/math status` が `path: text (fixed)` を表示し、`\\ket`、`\\bra`、`\\braket` を Pi が整形できる LaTeX に展開する。`QNI_MATH_PATH` は端末の自動判定を実装するまでの仮設定である。
4. スキル同梱の `scripts/qni` が使われ、Ruby、Bundler、リポジトリの絶対パスが使われない。
5. `circuit.json`、回路表示、16ショットの結果が作業ディレクトリに対して生成される。
6. 4種類の入力すべてで、入力2ビットと復号結果が一致する。
7. 説明が入力生成、Bell 対、符号化、復号、測定の順になっている。

確認後は、表示されたパッケージ元と同じ値を指定して削除する。

```bash
pi remove "$package_dir"
```
