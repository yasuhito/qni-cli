# Ruby fallback 削除リリース案内

## 状態

status: completed

このリリースで qni CLI から Ruby fallback と Ruby 実行時依存を削除しました。通常の `qni` コマンドは npm パッケージに含まれる TypeScript / Node.js 実装だけで動作します。

## 利用者向け概要

削除後は次の挙動になります。

- `QNI_USE_RUBY=1` はサポートされません。
- 配布コマンド経路は `bundle exec bin/qni` に委譲しません。
- Ruby、Bundler、Gemfile は通常利用にも npm パッケージ実行にも不要です。
- README の通常手順は Node.js / npm 経路だけを案内します。

## 移行方法

既存利用者は、Ruby fallback に依存した実行方法から npm 経路へ移行してください。

```bash
npm install
npm run build
node dist/bin/qni.js --help
```

npm パッケージ利用時は、インストールされた `qni` コマンドをそのまま使います。

```bash
qni --help
qni add H --qubit 0 --step 0
qni run
```

互換性確認が必要な場合は、削除前に保存済みの Ruby 比較アーカイブを参照します。

- `docs/reports/ruby-comparison-archive.md`
- `docs/reports/ruby-comparison-archive.json`

## 非 Ruby 補助境界

Ruby fallback は削除しましたが、Ruby ではない補助プログラムは引き続き残します。これらは CLI の一部機能を実現するための明示的な境界であり、Ruby fallback ではありません。

- `libexec/*.py`: 記号計算や描画補助で使う Python 実装。
- `scripts/setup_symbolic_python.sh`: Python 実行環境の準備。
- `pdflatex` / `pdftocairo`: PNG / LaTeX 系の出力で使う外部コマンド。

## 削除前の証跡

削除前に次の証跡を保存済みです。

- Ruby 比較アーカイブ: `docs/reports/ruby-comparison-archive.md`
- Ruby fallback なし npm リリースサイクル記録: `docs/reports/ruby-fallback-free-release-cycle.md`
- 準備状況棚卸し: `docs/reports/ruby-fallback-readiness-audit.md`

## 削除後の検証

Ruby fallback 削除後は Node 経路だけを検証します。

```bash
npm run check
npm run smoke:package
```

`npm run check` は TypeScript テスト、cucumber-js Markdown 機能ファイル、npm パッケージスモーク検証を実行します。

## 切り戻し手順

Ruby fallback 削除後に重大な問題が見つかった場合は、次の順で切り戻します。

1. 問題が TypeScript 実装、npm パッケージング、外部補助コマンドのどこにあるかを切り分ける。
2. 直近の Ruby fallback 削除コミットを revert するブランチを作成する。
3. revert 後に `npm run check` と `npm run smoke:package` を実行する。
4. npm パッケージの問題として公開済みの場合は、修正版のパッチリリースを作る。公開済みパッケージを消す前提にしない。
5. リリースノートに、影響範囲、回避方法、修正版バージョン、再発防止を追記する。

切り戻し時の検証コマンド例:

```bash
git revert <ruby-fallback-removal-commit>
npm run check
npm run smoke:package
```

## 削除後の確認観点

Ruby fallback 削除後は、次を確認します。

- 通常の実行経路に Ruby fallback 呼び出しが残っていない。
- npm パッケージの `files` に Ruby 実装・Gemfile・Ruby テストが含まれていない。
- README の通常インストール・利用手順が Ruby を要求していない。
- CI の通常 check が Node 経路で完結している。

## 関連

- #83 Ruby fallback と Ruby runtime dependency を削除する
- #277 Ruby 基準比較の最終アーカイブを作成する
- #279 Ruby fallback なし npm リリースサイクルを記録する
