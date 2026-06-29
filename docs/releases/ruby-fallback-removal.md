# Ruby fallback 削除リリース案内（draft）

## 状態

この文書は #83 用のリリース案内の下書きです。Ruby fallback と Ruby 実行時依存の削除は、Ruby fallback なし npm リリースサイクルが 1 回完了した後に実施します。

## 利用者向け概要

このリリースでは、qni CLI から Ruby fallback を削除します。通常の `qni` コマンドは npm パッケージに含まれる TypeScript / Node.js 実装だけで動作します。

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

`QNI_USE_RUBY=1 qni ...` を運用手順に含めている場合は、環境変数を削除してください。互換性確認が必要な場合は、削除前に保存済みの Ruby 比較アーカイブを参照します。

- `docs/reports/ruby-comparison-archive.md`
- `docs/reports/ruby-comparison-archive.json`

## 非 Ruby 補助境界

Ruby fallback は削除しますが、Ruby ではない補助プログラムは引き続き残します。これらは CLI の一部機能を実現するための明示的な境界であり、Ruby fallback ではありません。

- `libexec/*.py`: 記号計算や描画補助で使う Python 実装。
- `scripts/setup_symbolic_python.sh`: Python 実行環境の準備。
- `pdflatex` / `pdftocairo`: PNG / LaTeX 系の出力で使う外部コマンド。

## 事前検証

Ruby fallback 削除リリース前に、少なくとも次を最新の作業木で通します。

```bash
npm run check
npm run smoke:package
npm run archive:ruby-comparison
bundle exec rake check
```

Ruby fallback 削除後は Ruby 比較と旧 Ruby 検証を実行できないため、削除直前の最終証跡として上記結果を課題またはリリースノートに残します。

## npm リリースサイクル完了条件

#83 の削除に進む前に、Ruby fallback を使わない npm リリースサイクルを 1 回完了します。記録は `docs/reports/ruby-fallback-free-release-cycle.md` に残します。

完了条件は次の通りです。

- リリース候補または公開 npm パッケージを npm 経路でインストールできる。
- `npm run smoke:package` 相当の検証で、`bundle` shim を失敗させても代表コマンドが成功する。
- `qni --help`、基本的な回路編集、`qni run`、`qni benchmark run` が npm パッケージ経路で成功する。
- リリースサイクル中に `QNI_USE_RUBY=1` や `bundle exec bin/qni` への回避が不要だったことを記録する。

## 切り戻し手順

Ruby fallback 削除後に重大な問題が見つかった場合は、次の順で切り戻します。

1. 問題が TypeScript 実装、npm パッケージング、外部補助コマンドのどこにあるかを切り分ける。
2. 直近の Ruby fallback 削除コミットを revert するブランチを作成する。
3. revert 後に `npm run check`、`npm run smoke:package`、必要なら `bundle exec rake check` を実行する。
4. npm パッケージの問題として公開済みの場合は、修正版のパッチリリースを作る。公開済みパッケージを消す前提にしない。
5. リリースノートに、影響範囲、回避方法、修正版バージョン、再発防止を追記する。

切り戻し時の検証コマンド例:

```bash
git revert <ruby-fallback-removal-commit>
npm run check
npm run smoke:package
bundle exec rake check
```

## 削除後の確認観点

Ruby fallback 削除後は、次を確認します。

- `rg -n "QNI_USE_RUBY|runRubyFallback|bundle exec bin/qni" src package.json README.md docs .github` で通常経路に Ruby fallback が残っていない。
- npm パッケージの `files` に Ruby 実装・Gemfile・Ruby テストが含まれていない。
- README の通常インストール・利用手順が Ruby を要求していない。
- CI の通常 check が Node 経路で完結している。

## 関連

- #83 Ruby fallback と Ruby runtime dependency を削除する
- #277 Ruby 基準比較の最終アーカイブを作成する
