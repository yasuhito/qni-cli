# Qni CoResearcher / qni-cli

Qni CoResearcher は、自然言語の量子回路課題、`.qni` 提出物、qni-cli の決定論的な採点、研究試行ログをリポジトリファイルとして束ねる量子回路AI共同研究者ハーネスです。

`qni-cli` は、共同研究者や外部エージェントホストが使う決定論的な量子回路 CLI です。外部の AI または人間の共同研究者が量子回路の提出物を作り、qni-cli が回路の作成、実行、採点、研究試行の記録とレポートを担います。

qni-cli は AI を呼び出しません。外部の AI または人間の共同研究者が提出物を作ります。モデル選択、プロンプト実行、役割分担、会話文脈の管理は、現時点では qni-cli の外側にあるエージェントホストや人間の作業です。

## 研究の流れ

Qni CoResearcher の基本的な流れは、ベンチマーク課題 → `.qni` 提出物 → 決定論的な採点 → 研究試行ログとレポートです。

1. ベンチマーク課題は、自然言語の課題文と採点用の検証条件を Markdown と frontmatter で持ちます。
2. 共同研究者は、課題文を読み、1行に1つの完全な `qni ...` コマンドを書く `.qni` 提出物を作ります。
3. `qni benchmark run` または `qni benchmark run-all` が、提出物を一時的な作業場所で実行し、状態ベクトルや期待値などの検証条件に照らして採点します。
4. `qni research record` が、プロンプト、回答、提出物、採点結果を `research/runs/<timestamp>-<slug>/` に保存します。
5. `qni research report` が、保存済みの研究試行を読み、再採点せずに一覧と集計を表示します。

研究ログでは、リポジトリファイルを永続的な状態として扱い、会話セッションは一時的な作業文脈として扱います。共同研究者とのやり取りが終わっても、課題、提出物、プロンプト、回答、採点結果がファイルとして残るため、後から比較、レビュー、再利用できます。

## qni-cli が提供するもの

- `qni add`、`qni gate`、`qni rm`、`qni view` による `./circuit.json` の量子回路編集と確認
- `qni state`、`qni run`、`qni expect` による初期状態、状態ベクトル、期待値の確認
- `qni export`、`qni bloch` による回路図、状態ベクトル、Bloch sphere 画像の出力
- `qni benchmark` による `.qni` 提出物の決定論的な採点
- `qni research` による外部共同研究者の研究試行ログ保存とレポート

`qni` は常に現在の作業ディレクトリの `./circuit.json` を読み書きします。インストール済みパッケージから使う場合は `qni ...`、リポジトリ内で開発中の実装を使う場合は `node dist/bin/qni.js ...` を実行します。

## PhysicsIntern との関係

PhysicsIntern は、数学・理論物理の研究問題を、複数役割のエージェント、新しい文脈での呼び出し、構造化された `ResearchState`、git snapshot、プロバイダー抽象を中心に扱う研究支援システムです。

Qni CoResearcher も、研究状態を会話履歴だけに閉じ込めず、後から読めるファイルとして残す考え方を参考にしています。PhysicsIntern の `ResearchState` や `multi-agent pipeline` に近い構想はありますが、Qni の現時点の実装済み範囲は qni-cli による決定論的な回路操作、ベンチマーク採点、研究試行の記録とレポートです。

## 最短利用例

リポジトリ内で開発中の実装を試す場合は、依存関係を入れて TypeScript をビルドしてから `node dist/bin/qni.js` を実行します。記号計算と一部の画像出力を使う前には Python 環境を準備します。

```bash
npm install
npm run build
scripts/setup_symbolic_python.sh

node dist/bin/qni.js add H --qubit 0 --step 0
node dist/bin/qni.js add X --control 0 --qubit 1 --step 1
node dist/bin/qni.js view
node dist/bin/qni.js run --symbolic --basis bell
```

ベンチマーク採点の最小例:

```bash
node dist/bin/qni.js benchmark run \
  benchmarks/quantum-katas/basic-gates/state-flip.md \
  benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni
```

研究試行の記録では、外部で作ったプロンプト、回答、提出物ディレクトリをファイルパスで渡します。詳しい手順は [ベンチマークと研究試行](docs/benchmark.md) を参照してください。

## ドキュメント

- [CLI コマンドリファレンス](docs/cli.md): 汎用の `qni` コマンド、画像出力、Bloch sphere、状態ベクトル操作の例
- [ベンチマークと研究試行](docs/benchmark.md): `.qni` 提出物の採点、スモークセット、研究試行ログの手順
- [開発者向け手順](docs/development.md): セットアップ、ビルド、通常チェック、npm パッケージのスモーク検証
- [仕様](SPEC.md): `qni-cli` の詳細仕様

## 制限事項と次の段階

AI 呼び出し、複数エージェント処理、プロバイダー抽象、作業場所の自動準備はまだ qni-cli にありません。`qni research record` は研究試行ディレクトリを作りますが、git commit は作りません。構造化された `ResearchState` も現時点では実装済みの API ではなく、研究ログのファイル構造を将来深める方向の構想です。

次の段階では、外部エージェントホストとの接続、研究試行の比較、より豊かな研究状態の表現、ベンチマーク課題の拡充を検討します。これらを追加する場合も、qni-cli の決定論的な採点とリポジトリファイルによる研究ログを中心に保ちます。

## 開発者向け

通常の検証は次のコマンドで実行します。記号計算と画像出力を含む検証の前には、Python 環境と外部ツールの準備が必要です。詳しくは [開発者向け手順](docs/development.md) を参照してください。

```bash
scripts/setup_symbolic_python.sh
npm run check
```
