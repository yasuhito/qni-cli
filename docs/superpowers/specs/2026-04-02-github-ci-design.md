# GitHub CI Design

## Problem

このリポジトリには `Rakefile`、`features/`、`test/` がそろっているが、GitHub 上で pull request や push のたびに自動実行される CI がまだない。現状の開発者向け入口は README 上で `bundle exec rake check` に寄っている一方、`test/` 配下の Minitest はその集約対象に入っていないため、ローカルと CI の「正しい確認方法」が分かれやすい。

## Goal

- GitHub Actions で Ruby の基本チェックを自動実行できるようにする。
- ローカル開発と CI の入口をできるだけそろえる。
- `rake check` に Minitest を含め、README の開発導線と実際の検証内容を一致させる。

## Non-Goals

- Python ベースの symbolic/image 環境セットアップを CI に載せること
- `pdflatex` / `pdftocairo` が必要な画像出力の統合検証を今回の最初の CI に含めること
- 複数 Ruby バージョンの matrix 実行
- Codecov や status badge の導入

## Decisions

- GitHub Actions の workflow を `.github/workflows/ci.yml` に追加する。
- workflow のトリガーは `push` と `pull_request` にする。
- CI ジョブでは Ruby と Bundler をセットアップして `bundle exec rake check` を実行する。
- `Rakefile` に `rake test` を追加し、`rake check` の依存に `test` を含める。
- CI 導入の期待動作は `features/` に専用の feature として先に記述する。
- README の Development セクションに、`rake check` が Minitest も含むことを明記する。

## Design

### Rake Entry Point

- `test/**/*_test.rb` を対象にする Minitest 用 task を `Rakefile` に追加する。
- `rake check` は既存の `rubocop`、`flog`、`flay`、`reek`、`cucumber` に加えて `test` も実行する。
- これにより、開発者はローカルでも CI でも `bundle exec rake check` を覚えればよい。

### GitHub Actions Workflow

- 単一 job の workflow とし、最初の導入では構成を薄く保つ。
- job は Ubuntu 上で動かし、リポジトリ checkout、Ruby セットアップ、Bundler キャッシュ、`bundle exec rake check` 実行の順に構成する。
- 失敗箇所の切り分けは Rake の出力に委ね、必要になった時点で job 分割を検討する。

### Feature-First Coverage

- AGENTS.md のルールに合わせ、CI 導入前に `features/github_ci.feature` のような専用 feature を追加する。
- この feature では「`rake check` が Minitest を含むこと」と「GitHub Actions workflow が存在し、標準の検証入口を呼ぶこと」を表現する。
- 実行対象は Ruby コードではなくリポジトリ設定なので、step definitions ではファイル存在確認や文字列確認を行う想定とする。

### Documentation

- README の Development セクションで `bundle exec rake check` の説明を更新する。
- 個別実行例にも `bundle exec rake test` を追加し、CI と同じ検証単位を手元でも再現しやすくする。

## Impacted Areas

- `features/` に CI 導入用 feature を追加
- 必要なら `features/step_definitions/cli_steps.rb` に設定確認用 step を追加
- `Rakefile`
- `.github/workflows/ci.yml`
- `README.md`

## Validation

- `bundle exec cucumber features/github_ci.feature`
- `bundle exec rake test`
- `bundle exec rake check`
- 必要なら touched files への focused RuboCop
