# ADR 0031: モデル筆記試験の拡張機能は隔離した Claude Bridge 1つだけを例外にする

## 状況

[ADR 0023](0023-run-model-written-tests-through-isolated-pi.md) は、`qni research solve` の Pi で拡張機能を無効にすると決めた。一方、Claude Code のサブスクリプションで動くモデルは、Pi の拡張機能 [pi-claude-bridge](https://github.com/elidickinson/pi-claude-bridge) が登録するプロバイダー `claude-bridge` からしか使えない。`--no-extensions` のままではこのプロバイダーが存在せず、裸のモデル ID は同名の有料 API プロバイダーに解決されうる。

ブリッジは Claude Code の子プロセスを起動する。設定読み込み元を指定しないと、子プロセスは利用者の `~/.claude` の設定、フック、プラグイン、言語設定を読み込み、課題文以外の文脈がモデルに届く。

## 決定

ADR 0023 の「拡張機能を無効にする」に、次の狭い例外だけを設ける。ADR 0023 のほかの決定と、この例外を使わない実行は変えない。

- `--claude-bridge-extension <file>` は `--provider claude-bridge` と併用した場合だけ受け付ける。
- Pi は `--no-extensions` のまま、指定した1ファイルだけを `-e` で読み込む。道具、セッション、文脈ファイル、スキル、プロンプトテンプレートは引き続き無効にする。
- 課題ごとの空の作業場所に `.pi/claude-bridge.json` として `{"provider":{"settingSources":[]}}` を置き、Claude Code の子プロセスに利用者の設定を読ませない。
- 事前確認で、正しい設定ではモデルが登録され、不正な `settingSources` では登録されないことを確かめる。拒否しないブリッジは隔離を保証できないため、モデルを呼ぶ前に停止する。
- `--provider` を付けた実行では、カタログ行と応答のプロバイダー・モデル ID が指定と完全一致しなければ使わない。

## 結果

この経路の研究試行は API へ直接送る経路と同一条件ではない。Claude Code の `claude_code` プリセットのシステムプロンプトに課題のシステムプロンプトが追記され、Claude Code は OAuth アカウントのメールアドレスを文脈に付加する。`metadata.json` の `harness.runner` を `pi-claude-bridge` とし、`harness.claudeBridge` に拡張機能のパス、`src` ディレクトリの SHA-256、`settingSources`、システムプロンプトの扱いを残す。`harness.runner` が `pi` の研究試行と同じ順位表で比較しない。

ブリッジはモデルの単価を0として登録するため、Pi が報告する料金は0になる。これは無料や請求額を意味せず、料金の見積もりでもない。

`provider.settingSources` は pi-claude-bridge 0.9.3 には無く、パッチを当てた版が必要になる。最初の実行条件は [Claude Bridge Opus 5.5 ベースラインの再現条件](../reports/claude-bridge-opus-5-5-baseline-2026-11-03.md) に記録した。
