# 開発者向け手順

この文書は、qni-cli をリポジトリ内で開発、検証するための手順をまとめます。汎用の CLI 利用例は [cli.md](cli.md)、ベンチマーク採点と研究試行ログの手順は [benchmark.md](benchmark.md) を参照してください。

## JavaScript 依存関係を入れる

Node.js 22、または `@cucumber/cucumber` が対応する Node.js を使います。

```bash
npm install
```

## TypeScript CLI をビルドする

```bash
npm run build
```

ビルド後、開発中の CLI は `node dist/bin/qni.js` として実行できます。

## 記号計算用 Python を準備する

`qni run --symbolic`、`qni bloch`、`qni export --circle-notation --png` を使う前に実行します。

```bash
scripts/setup_symbolic_python.sh
```

## 画像出力用の外部ツールを入れる

`qni export --png` と `qni export --state-vector --png` には次の外部コマンドが必要です。

- `pdflatex`
- `pdftocairo`

## 通常チェックを実行する

```bash
scripts/setup_symbolic_python.sh
npm run check
```

`npm run check` は TypeScript テスト、cucumber-js の Markdown feature、npm パッケージのスモーク検証を実行します。

## 個別チェックを実行する

```bash
npm run build
npm run test:ts
npm run cucumber
npm run smoke:package
```

`npm run smoke:package` は npm パッケージのスモーク検証を実行します。プロジェクトをビルドして `npm pack` で tarball を作り、一時プロジェクトへインストールします。その後、インストール済みの `qni`、超密度符号化、同梱 CLI を使うスキル、Pi によるスキル検出を確認します。

公開前に人が確認する手順は [公開前の npm / Pi パッケージ確認](pi-package.md) を参照してください。
