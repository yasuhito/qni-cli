# Qni CoResearcher / qni-cli

Qni CoResearcher は、自然言語の量子回路課題、`.qni` 提出物、qni-cli の決定論的な採点、研究試行ログをリポジトリファイルとして束ねる量子回路AI共同研究者ハーネスです。

`qni-cli` は、共同研究者や外部エージェントホストが使う決定論的な量子回路 CLI です。外部の AI または人間の共同研究者が量子回路の提出物を作る経路では、qni-cli が回路の作成、実行、採点、研究試行の記録とレポートを担います。

`qni benchmark` と `qni research record` は AI を呼びません。モデル別コストベンチマークで使う `qni research solve` だけは、`research/models.yaml` の登録に従って OpenAI互換 Chat Completions API を直接呼び出します。複数エージェント処理やプロバイダー抽象は、現時点では qni-cli にありません。

評価ランナーと研究プロトコルの違いは [ベンチマークと研究試行](docs/benchmark.md) で確認できます。`qni benchmark` は `.qni` 提出物を採点する評価ランナーで、`qni research solve` と `qni research record --circuit-json-dir` は中立回路 JSON を受け取る `blind-neutral-circuit-json-v1` の研究プロトコルです。既存の `.qni` 直接提出は `qni-command-output-v0` の legacy protocol として残し、公平比較用の結果とは分けて扱います。

## 研究の流れ

Qni CoResearcher には、評価ランナー（`.qni`）と研究プロトコル（`blind-neutral-circuit-json-v1` / `qni-command-output-v0`）の 2 つの提出経路があります。
ベンチマーク課題は `.qni` で採点し、研究試行では中立回路 JSON と legacy `.qni` を `submissionProtocol` で区別します。

1. ベンチマーク課題は、自然言語の課題文と採点用の検証条件を Markdown と frontmatter で持ちます。
2. 公平比較用の主経路では、共同研究者やモデルは qni-cli 固有語彙を見ずに中立回路 JSON を作ります。既存の `.qni` 直接提出経路では、1行に1つの完全な `qni ...` コマンドを書く `.qni` 提出物を作ります。
3. `qni benchmark run` または `qni benchmark run-all` が、`.qni` 提出物を一時的な作業場所で実行し、状態ベクトルや期待値などの検証条件に照らして採点します。中立回路 JSON は研究コマンド内で `.qni` に変換してから同じ評価ランナーに渡します。
4. 外部で作った成果物は `qni research record` が、登録済みモデルを直接実行する場合は `qni research solve` が、プロンプト、回答、提出物、採点結果を `research/runs/<timestamp>-<slug>/` に保存します。研究試行の `submissionProtocol` で `blind-neutral-circuit-json-v1` と `qni-command-output-v0` を区別します。
5. `qni research report` が保存済みの研究試行を読み、`qni research plot` がモデル別コストベンチマークの散布図を生成します。

研究ログでは、リポジトリファイルを永続的な状態として扱い、会話セッションは一時的な作業文脈として扱います。共同研究者とのやり取りが終わっても、課題、提出物、プロンプト、回答、採点結果がファイルとして残るため、後から比較、レビュー、再利用できます。

## qni-cli が提供するもの

- `qni add`、`qni gate`、`qni rm`、`qni view` による `./circuit.json` の量子回路編集と確認
- `qni state`、`qni run`、`qni expect` による初期状態、状態ベクトル、期待値の確認
- `qni export`、`qni bloch` による回路図、状態ベクトル、Bloch sphere 画像の出力
- `qni benchmark` による `.qni` 提出物の決定論的な採点
- `qni research` による外部共同研究者の研究試行ログ保存、単一モデルの直接実行、レポート、研究試行比較、コスト散布図の生成

`qni` は常に現在の作業ディレクトリの `./circuit.json` を読み書きします。インストール済みパッケージから使う場合は `qni ...`、リポジトリ内で開発中の実装を使う場合は `node dist/bin/qni.js ...` を実行します。

## PhysicsIntern との関係

PhysicsIntern は、数学・理論物理の研究問題を、複数役割のエージェント、新しい文脈での呼び出し、構造化された `ResearchState`、git snapshot、プロバイダー抽象を中心に扱う研究支援システムです。

Qni CoResearcher も、研究状態を会話履歴だけに閉じ込めず、後から読めるファイルとして残す考え方を参考にしています。PhysicsIntern の `ResearchState` や `multi-agent pipeline` に近い構想はありますが、Qni の現時点の実装済み範囲は qni-cli による決定論的な回路操作、ベンチマーク採点、研究試行の記録、単一モデルの OpenAI互換 API の直接実行、コスト散布図、レポートです。

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

研究試行の記録では、外部で作ったプロンプト、回答、提出物ディレクトリをファイルパスで渡します。モデル別コストベンチマークでは、モデル登録ファイルを用意して `qni research solve` と `qni research plot` を実行します。詳しい手順は [ベンチマークと研究試行](docs/benchmark.md) と [モデル別コストベンチマーク利用手順](docs/model-cost-benchmark.md) を参照してください。

## ドキュメント

- [CLI コマンドリファレンス](docs/cli.md): 汎用の `qni` コマンド、画像出力、Bloch sphere、状態ベクトル操作の例
- [ベンチマークと研究試行](docs/benchmark.md): `.qni` 提出物の採点、スモークセット、研究試行ログ、研究試行比較の手順
- [モデル別コストベンチマーク利用手順](docs/model-cost-benchmark.md): モデル登録、`qni research solve`、`qni research plot`、score と cost、初期スコープ外の説明
- [開発者向け手順](docs/development.md): セットアップ、ビルド、通常チェック、npm パッケージのスモーク検証
- [仕様](SPEC.md): `qni-cli` の詳細仕様

## 制限事項と次の段階

`qni research solve` は、単一モデル・単一試行・逐次実行の OpenAI互換 Chat Completions API の直接呼び出しだけを扱います。複数モデルの一括実行、複数試行、再試行、自己修正、外部エージェント自動実行、既存試行の移行、プロバイダー抽象、作業場所の自動準備はまだ qni-cli にありません。`qni research record` は AI を呼ばず、研究試行ディレクトリを作りますが、git commit は作りません。`qni research compare` は保存済み研究試行を読むだけで、再採点や公平比較用の順位付けは行いません。構造化された `ResearchState` も現時点では実装済みの API ではなく、研究ログのファイル構造を将来深める方向の構想です。

次の段階では、外部エージェントホストとの接続、研究試行の比較、より豊かな研究状態の表現、ベンチマーク課題の拡充を検討します。これらを追加する場合も、qni-cli の決定論的な採点とリポジトリファイルによる研究ログを中心に保ちます。

## 開発者向け

通常の検証は次のコマンドで実行します。記号計算と画像出力を含む検証の前には、Python 環境と外部ツールの準備が必要です。詳しくは [開発者向け手順](docs/development.md) を参照してください。

```bash
scripts/setup_symbolic_python.sh
npm run check
```
