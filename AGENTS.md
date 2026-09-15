# AGENTS.md

## ドキュメント言語

- 設計検討ドキュメントは日本語で書く。
- 計画書は日本語で書く。
- 仕様書、計画書、GitHub issue/PRD への書き込みでは、不自然な英日混在の「ルー語」を避ける。英語の普通名詞に自然な日本語訳がある場合は日本語で書く（例: `step definition の意図` ではなく `ステップ定義の意図`、`env setup` ではなく `環境変数の準備`、`command 実行` ではなく `コマンド実行`）。ただし、ツール名、ファイル名、API名、CLI引数、環境変数、Gherkin キーワード（`Given` / `When` / `Then`）、プログラミング言語名など、識別子や固有の技術用語として英語表記が必要な語はそのまま書いてよい。
- qni-cli の TypeScript 移行に関する説明でも、読み手向けの文章は自然な日本語にし、コード識別子・コマンド・エラーメッセージ・ファイルパスは原文を保つ。

## Agent skills

### Issue tracker

課題と PRD は GitHub Issues で管理する。外部 Pull request は triage 対象にしない。詳細は `docs/agents/issue-tracker.md` を参照する。

### Triage labels

Matt 系スキルの標準 triage 役割は、同名の GitHub label に対応させる。詳細は `docs/agents/triage-labels.md` を参照する。

### Domain docs

このリポジトリは single-context として扱い、ルートの `CONTEXT.md` と `docs/adr/` を使う。詳細は `docs/agents/domain.md` を参照する。

## 機能開発規則

- `features/*.feature` または `features/*.feature.md` のない機能は存在しないのと同じ。
- 機能を追加するときには、先に `features/*.feature` または `features/*.feature.md` を追加する。

## Cucumber シナリオ規則

- 1つの Cucumber シナリオに `Then` は1つだけ置く。
- `Then` の後に続く検証目的の `And` も `Then` とみなす。
- 2つ以上の検証が必要な場合は、失敗箇所を分かりやすくするため別々のシナリオに分ける。
- `コマンドは成功して標準出力:` や `コマンドは失敗して標準エラー:` のように、複数の検証を1つにまとめた複合検証ステップは追加しない。
- 成功/失敗確認と stdout/stderr の確認が両方必要な場合も、検証目的ごとにシナリオを分ける。

## qni CLI 成長規則

- qni CLI にまだ無い機能が必要になったときは、既存機能でごまかす前に機能追加を検討する。
- Quantum Katas など既知の利用場面で自然に必要な機能は、機能仕様を先に定義する方針で qni CLI に追加することを優先する。
- 元のタスクや回路の意図を崩して回避するのではなく、qni CLI 自体を成長させる方向をまず考える。

## GitHub issue 規則

- GitHub issue を作成するとき、タイトルは日本語にする。

## PR レビュー規則

- PR をレビューしてマージしてよいと判断した場合は、ユーザーの追加確認を待たずにマージしてよい。
- 対応が必要と判断した場合は、PR に具体的な指摘と修正方針をコメントし、対応する GitHub issue があれば状態やラベルを更新する。

## 検証規則

- commit や push の前には、全体チェックを最新状態で通す。
- 少なくとも `npm run check` を成功させてから commit / push する。
- 部分的なテストや前回の成功結果ではなく、その時点の作業木に対する最新の実行結果を確認する。
