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

一覧に `dist/`、`dist/qni-tools/index.js`、`libexec/`、`benchmarks/`、`examples/superdense-coding/`、`skills/qni-cli/`、`LICENSE` があることを確認する。

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

qni-cli 0.2.0 は pi-formula 0.1.0 を完全固定して同梱する。数式描画と設定は pi-formula が正本であり、確認には `/formula` を使う。

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

1. Pi が `qni-tools` 拡張、`pi-formula` の `/formula`、`qni-cli` スキルを読み込む。本文の `$...$` と `\(...\)` は Pi の Unicode テキストで、`$$...$$` と `\[...\]` は Ghostty / Kitty の画像で描く。`\ket`、`\bra`、`\braket` は qni-cli が追加する量子系マクロとして設定なしで使える。
2. 数式表示の経路、利用者マクロ、キャッシュは pi-formula の `/formula` と設定で確認する。
3. スキル同梱の `scripts/qni` が使われ、Ruby、Bundler、リポジトリの絶対パスが使われない。
4. 専用 `qni` ツールに `{"args":["--help"]}` を渡すと qni-cli の使い方が返り、`bash` ツールは従来どおり残る。依存する複数コマンドを `{"commands":[["add","H","--qubit=0","--step=0"],["view"],["run"]]}` として渡すと、同じ作業場所で順に一括実行される。`workdir` を省略した呼び出しは、セッション専用の一時作業場所を使う。ツール結果を展開すると、実際の作業場所を確認できる。
5. 利用者の作業場所へ成果物を残す確認では、`{"args":[...],"workdir":"."}` のように、Pi の作業場所からの相対パスを明示する。`circuit.json`、回路表示、16ショットの結果が指定先に生成される。
6. 4種類の入力すべてで、入力2ビットと復号結果が一致する。
7. 説明が入力生成、Bell 対、符号化、復号、測定の順になっている。

確認後は、表示されたパッケージ元と同じ値を指定して削除する。

```bash
pi remove "$package_dir"
```
