# Qni CoResearcher / qni-cli

Qni CoResearcher は、AI または人間の共同研究者が作った量子回路提出物を、qni-cli の決定論的な採点とリポジトリファイルの研究ログで再現可能に扱うハーネスです。

`qni-cli` は、その中で量子回路を作成、実行、表示、検証、採点、研究ログ化する Node.js / TypeScript 製 CLI です。現時点では、qni-cli が AI を呼び出すのではなく、外部の共同研究者が作った `.qni` 提出物や研究試行の材料を受け取って扱います。

## できること

- `qni add`、`qni gate`、`qni rm`、`qni view` で `./circuit.json` の量子回路を編集、確認する
- `qni state`、`qni run`、`qni expect` で初期状態、状態ベクトル、期待値を確認する
- `qni export`、`qni bloch` で回路図、状態ベクトル、Bloch sphere 画像を出力する
- `qni benchmark` で `.qni` 提出物をベンチマーク課題に照らして採点する
- `qni research` で外部共同研究者の研究試行ログを保存、閲覧する

## ドキュメント

- [CLI コマンドリファレンス](docs/cli.md): 汎用の `qni` コマンド、画像出力、Bloch sphere、状態ベクトル操作の例
- [ベンチマークと研究試行](docs/benchmark.md): `.qni` 提出物の採点、スモークセット、研究試行ログの手順
- [開発者向け手順](docs/development.md): セットアップ、ビルド、通常チェック、npm パッケージのスモーク検証
- [仕様](SPEC.md): `qni-cli` の詳細仕様

## 最短利用例

リポジトリ内で開発中の実装を試す場合は、依存関係を入れて TypeScript をビルドしてから `node dist/bin/qni.js` を実行します。

```bash
npm install
npm run build

node dist/bin/qni.js add H --qubit 0 --step 0
node dist/bin/qni.js add X --control 0 --qubit 1 --step 1
node dist/bin/qni.js view
node dist/bin/qni.js run --symbolic --basis bell
```

インストール済みパッケージから使う場合は、上の `node dist/bin/qni.js` を `qni` に読み替えてください。`qni` は常に現在の作業ディレクトリの `./circuit.json` を読み書きします。

## 開発者向け

通常の検証は次のコマンドで実行します。記号計算と画像出力を含む検証の前には、Python 環境と外部ツールの準備が必要です。詳しくは [開発者向け手順](docs/development.md) を参照してください。

```bash
scripts/setup_symbolic_python.sh
npm run check
```
