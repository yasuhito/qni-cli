# Feature: Workspace noise

qni-cli の Symphony workspace 利用者として
作業に関係ない生成ファイルで git status が埋まらないようにしたい

## Scenario: `.codex/` は ignore される

- Then リポジトリファイル ".gitignore" は ".codex/" を含む

## Scenario: `excalidraw.log` は ignore される

- Then リポジトリファイル ".gitignore" は "excalidraw.log" を含む
