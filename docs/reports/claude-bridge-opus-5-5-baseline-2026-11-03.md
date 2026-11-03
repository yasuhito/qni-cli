# Claude Bridge Opus 5.5 ベースラインの再現条件

実施日: 2026-11-03 (UTC)

この文書は、隔離した Claude Bridge 経由で最初に実行した Quantum Katas 固定63課題ベースラインの実行条件と再現手順を記録します。研究試行ディレクトリは保存時のまま変更しません ([ADR 0014](../adr/0014-do-not-overwrite-research-trials.md)、[ADR 0019](../adr/0019-research-report-does-not-regrade.md))。判断の背景は [ADR 0031](../adr/0031-allow-only-an-explicit-isolated-claude-bridge-extension-in-solve.md) を参照してください。

## 研究試行

| 研究試行                                                              | 課題   | 結果                                       | 経過時間 | トークン合計 |
| --------------------------------------------------------------------- | ------ | ------------------------------------------ | -------- | ------------ |
| `research/runs/2026-11-03T024825Z-claude-bridge-opus-5-5-high-smoke`  | 3課題  | 3 passed                                   | 15秒     | 6,394        |
| `research/runs/2026-11-03T024931Z-claude-bridge-opus-5-5-high-full63` | 63課題 | 55 passed、3 failed、5 disallowed、0 error | 457秒    | 159,324      |

経過時間はコマンド全体の実測値で、研究試行ファイルには含まれません。63課題の研究試行の git tree は `8dd460002f63f920118d89517163495ecf9e0b4d` です。

## 実行条件

- qni-cli: `e192e09c` に `57c976d7` (隔離した Claude Bridge とプロバイダー固定) を加えた版
- 課題集合: `benchmarks/quantum-katas` (git tree `c8ed36f52b2ad3d27cc9477696d64d1d333f0594`、63課題)
- 提出プロトコル: `blind-neutral-circuit-json-v1`
- モデル: `claude-bridge/claude-opus-5-5`、`--thinking high` (Claude Code の effort `high`)
- 課題ごとに新しい Pi を1回だけ呼び、逐次実行しました。自動再試行、並列実行、自己修正はしていません。
- Pi 1.4.0
- pi-claude-bridge 0.9.3 (npm tarball shasum `fe28fda31af2ad448d9792fd453bbb60cad726dd`) に [`provider.settingSources` パッチ](pi-claude-bridge-0.9.3-setting-sources.patch) を当てたもの
- 依存: `@anthropic-ai/claude-agent-sdk` 0.3.293、Claude Code 2.1.293
- 課題ごとの `.pi/claude-bridge.json`: `{"provider":{"settingSources":[]}}`
- 環境変数: `HOME`、`PATH`、`USER`、`LANG=C.UTF-8`、`SHELL` だけを渡しました

`metadata.json` の `harness.claudeBridge.sourceDirectorySha256` (`e210ee6331949ca07b2b83db11810cc20addc2feb7a3a13ab388fc42c6dbfcc9`) は、ブリッジの `src` ディレクトリだけのハッシュです。`node_modules` の依存は含みません。依存の版は上の一覧で記録します。`harness.claudeBridge.extension` は実行時の一時的なコピーの場所で、そのパスは残っていません。

### ランナー条件

`harness.runner` は `pi-claude-bridge` です。API へ直接送る経路 (`harness.runner` が `pi`) とは次の点が違うため、同一条件として比較しないでください。

- Claude Code は、`claude_code` プリセットのシステムプロンプトの後ろに課題のシステムプロンプトを追記します。
- Claude Code は OAuth アカウントのメールアドレスを文脈に付加します。研究試行にはその値を保存していません。
- Claude Code は作業場所の情報 (一時ディレクトリ名など) を文脈に入れます。既定の Pi 経路も作業場所を文脈に入れます。

ダミー API キーとローカルの受信サーバーで実際のリクエスト本文を捕捉し、`settingSources: []` では利用者の設定、フック、プラグイン、言語設定が含まれないことを確かめました。比較のため `["project"]` を指定すると、作業場所に置いたカナリア設定が本文に現れました。この捕捉方法で設定を検出できるということです。ダミー API キーでは OAuth を使わないので、メールアドレスの付加はこの方法では観測できません。

## 料金

ブリッジはモデルの単価を0として登録するため、研究試行に保存された料金 (`cost.totalUsd`) は `0` です。これは無料や請求額を意味せず、料金の見積もりでもありません。

参考として、研究試行に保存されたトークン数に Pi 1.4.0 に同梱された `@earendil-works/pi-ai` 1.4.0 の `anthropic` プロバイダーの `claude-opus-5-5` の単価 (入力 4、出力 20、キャッシュ読み込み 0.2、キャッシュ書き込み 5、いずれも USD/100万トークン) を掛けると、3課題で 0.0214 USD、63課題で 0.7429 USD です。これは研究試行の外で計算した値です。単価の基準日と、Anthropic の公表価格との一致は確認していません。サブスクリプションの請求額でもありません。

## 採点器の修正後の診断

63課題のうち `qft/binary-fraction-quantum` の `disallowed` は、角度 `pi` を変数として扱っていた採点器の欠陥が原因です。修正 (`63aad1fc`) 後の採点器で、保存済みの63回答を研究試行の外で採点し直すと 56 passed、3 failed、4 disallowed、0 error でした。差はこの1課題だけです。これはモデルの再実行ではなく、公式の結果は 55 passed のままです。

## 再現手順

1. pi-claude-bridge 0.9.3 を取得し、shasum を確かめてからパッチを当てます。

   ```bash
   npm pack pi-claude-bridge@0.9.3
   sha1sum pi-claude-bridge-0.9.3.tgz   # fe28fda31af2ad448d9792fd453bbb60cad726dd
   tar -xzf pi-claude-bridge-0.9.3.tgz
   cd package
   patch -p1 < <qni-cli>/docs/reports/pi-claude-bridge-0.9.3-setting-sources.patch
   ```

   パッチ後の `src/config.ts` の SHA-256 は `2e0bb905329a7818d696ff9ebff46e96bed998bb3ae0b41f13a427ee268eaea1`、`src/index.ts` は `459a92770980e877e6ab0f742f62b93edba0138ad672ef9855e6f133643b511a` です。パッチには上流の単体テスト `tests/unit-setting-sources.mjs` も含まれます。上流コミット `874fa7c` (Release 0.9.3) にパッチを当て、単体テスト340件と型検査が通ることを確かめました。

2. `package/node_modules` から、上に挙げた版の Agent SDK と Pi のパッケージを読めるようにします。最初の実行では、インストール済みの Claude Bridge の依存を読み取り専用で参照しました。インストール済みのブリッジと Pi の設定は変更していません。

3. Claude Code にサブスクリプションでログインした状態で、qni-cli のリポジトリルートから実行します。

   ```bash
   env -i HOME="$HOME" PATH="$PATH" USER="$USER" LANG=C.UTF-8 SHELL=/bin/bash \
     node dist/bin/qni.js research solve \
       --provider claude-bridge \
       --model claude-opus-5-5 \
       --claude-bridge-extension <package>/src/index.ts \
       --thinking high \
       --benchmark benchmarks/quantum-katas \
       --slug <slug>
   ```

   `ANTHROPIC_BASE_URL`、`ANTHROPIC_API_KEY`、`ANTHROPIC_AUTH_TOKEN` を渡すと Claude Code の接続先と認証が変わるため、渡さないでください。
