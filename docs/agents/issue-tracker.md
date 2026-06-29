# Issue tracker: GitHub

このリポジトリの課題と PRD は GitHub Issues で管理する。操作には `gh` CLI を使う。

## 対象リポジトリ

- `yasuhito/qni-cli`

## 規約

- 課題を作成する: `gh issue create --title "..." --body "..."`
- 課題を読む: `gh issue view <number> --comments`
- 課題を一覧する: `gh issue list --state open --json number,title,body,labels,comments`
- 課題にコメントする: `gh issue comment <number> --body "..."`
- ラベルを付け外しする: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- 課題を閉じる: `gh issue close <number> --comment "..."`

`gh` はリポジトリ内で実行すれば `git remote` から対象リポジトリを推定する。

## Pull request を triage 対象にするか

**外部 Pull request は triage 対象にしない。**

このリポジトリでは、外部 Pull request を要望受付口として Issue と同じキューには入れない。Pull request は通常のレビュー対象として扱う。

## スキルが「issue tracker に publish する」と言ったとき

GitHub issue を作成する。

## スキルが「relevant ticket を fetch する」と言ったとき

`gh issue view <number> --comments` で GitHub issue を読む。
