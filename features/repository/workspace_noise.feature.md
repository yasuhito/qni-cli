# Feature: ワークスペースのノイズ

qni-cli の Symphony ワークスペース利用者として
作業に関係ない生成ファイルで git status が埋まらないようにしたい

## Scenario: `.codex/` は無視される

- Then リポジトリファイル ".gitignore" は ".codex/" を含む

## Scenario: `excalidraw.log` は無視される

- Then リポジトリファイル ".gitignore" は "excalidraw.log" を含む
