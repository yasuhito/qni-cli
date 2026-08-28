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

## 利用者マクロを設定する

数式描画拡張には、JSON で利用者マクロを追加できる。値は置換文字列、または `[置換文字列, 引数の数]` とする。たとえば `\op{H}` を `\hat{H}` に展開する定義は次のとおり。

```json
{
  "macros": {
    "op": ["\\hat{#1}", 1]
  }
}
```

この `macros` を `~/.config/qni-cli/qni-math.json`（`XDG_CONFIG_HOME` があればその配下）へ追加する。環境変数を使う場合は、マクロ定義オブジェクトだけを `QNI_MATH_MACROS` に渡す。

```bash
export QNI_MATH_MACROS='{"op":["\\hat{#1}",1]}'
```

設定ファイルと環境変数に同じ名前がある場合は、環境変数を優先する。JSON または定義が壊れている場合、利用者マクロをすべて無効にして既定マクロだけを使う。理由は `/math status` の `macro error` で確認できる。既定の `\ket`、`\bra`、`\braket` は変更できない。

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
2. `/math status` が `qni-math` の版、`path: image`、`reason: 問い合わせ応答 OK` を表示し、本文の `$...$`、`$$...$$`、`\\(...\\)`、`\\[...\\]` を Ghostty / Kitty の画像で描く。コードと thinking ブロックの数式は変換しない。
3. `/math text` の後は `/math status` が `path: text` と `reason: 手動指定` を表示し、`\\ket`、`\\bra`、`\\braket` を Pi が整形できる LaTeX に展開する。`/math auto` で端末問い合わせによる自動判定へ戻る。
4. `/math image|text|auto` は現在のセッションに残る。`--default` を付けると `~/.config/qni-cli/qni-math.json`（`XDG_CONFIG_HOME` があればその配下）へ全体既定を保存する。`/math auto --default` は保存した既定を消す。
5. スキル同梱の `scripts/qni` が使われ、Ruby、Bundler、リポジトリの絶対パスが使われない。
6. 専用 `qni` ツールに `{"args":["--help"]}` を渡すと qni-cli の使い方が返り、`bash` ツールは従来どおり残る。
7. `circuit.json`、回路表示、16ショットの結果が作業ディレクトリに対して生成される。
8. 4種類の入力すべてで、入力2ビットと復号結果が一致する。
9. 説明が入力生成、Bell 対、符号化、復号、測定の順になっている。
10. 利用者マクロを設定した場合、画像経路とテキスト経路の両方で展開される。壊れた定義では `/math status` に `macro error` が表示され、既定マクロは引き続き使える。

確認後は、表示されたパッケージ元と同じ値を指定して削除する。

```bash
pi remove "$package_dir"
```
