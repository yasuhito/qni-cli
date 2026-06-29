# Ruby fallback 削除完了レポート

作成日: 2026-06-29
関連: #83, #271, #272, #273, #274, #275, #276, #277, #278, #279

## 結論

#83 の Ruby fallback / Ruby 実行時依存削除は完了した。

公開コマンド本体は TypeScript 実装または維持する非 Ruby 補助プログラム境界へ移行済みであり、Ruby 比較アーカイブ、Ruby fallback なし npm リリースサイクル記録、リリース案内、切り戻し手順も保存済みである。

## 削除したもの

- dispatcher-level の Ruby fallback と `QNI_USE_RUBY=1` override。
- Ruby fallback 専用の process compatibility API。
- `Gemfile`, `Gemfile.lock`, `Rakefile`。
- `bin/qni` と `lib/qni/**`。
- Ruby テストと Ruby 品質チェック設定。
- legacy Ruby CI job。
- README の Ruby fallback 運用説明。
- Ruby / TypeScript 比較を実行する保守スクリプト。

## 維持する非 Ruby 補助境界

Python 補助プログラム、`pdflatex`、`pdftocairo` は Ruby fallback ではないため維持する。

- `libexec/*.py`
- `scripts/setup_symbolic_python.sh`
- `pdflatex`
- `pdftocairo`

## 削除前に保存した証跡

- Ruby 比較アーカイブ: `docs/reports/ruby-comparison-archive.md`, `docs/reports/ruby-comparison-archive.json`
- Ruby fallback なし npm リリースサイクル記録: `docs/reports/ruby-fallback-free-release-cycle.md`
- Ruby fallback 削除リリース案内と切り戻し手順: `docs/releases/ruby-fallback-removal.md`

## 最終チェックリスト

- [x] #274 を完了し、`src/commands/**/*.ts` から `runRubyFallbackSync` import をなくす。
- [x] 未知の最上位コマンドを TypeScript 側で処理し、dispatcher が通常入力で Ruby に委譲しないことを確認する。
- [x] npm エントリーポイントで cucumber-js Markdown 機能ファイルが通ることを確認する。
- [x] Node ベースの全体チェックを定義する。
- [x] README の通常セットアップ・Quick Start・開発手順を npm / Node 経路へ更新する。
- [x] CI を Node ベースの通常検証へ切り替える。
- [x] npm パッケージとしてのスモーク検証を追加する。
- [x] Ruby 基準比較の最終アーカイブまたは参照先を残す。
- [x] npm 配布で Ruby fallback を使わないリリースサイクルを1回完了する。
- [x] rollback plan と release note の要点を用意する。
- [x] dispatcher の Ruby fallback 経路を削除する。
- [x] `QNI_USE_RUBY` override を削除する。
- [x] Ruby 実装・Ruby テスト・Ruby 品質チェック設定を削除する。

## 削除後の検証コマンド

Ruby fallback 削除後は次を使う。

```bash
npm run check
npm run smoke:package
```

`npm run check` は TypeScript テスト、cucumber-js Markdown 機能ファイル、npm パッケージスモーク検証を実行する。
