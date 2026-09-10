# Feature: pi-formula 移行版を公開案内する

qni-cli 0.2.0 の利用者として
数式描画の提供元と互換性変更を把握したい
確認済みの pi-formula を使って Pi で数式を読めるようにするため

## Scenario: qni-cli 0.2.0 は pi-formula 0.1.0 を完全固定する

- Then リポジトリファイル "package.json" は "\"version\": \"0.2.0\"" を含む

## Scenario: pi-formula の版範囲を使わない

- Then リポジトリファイル "package.json" は "\"pi-formula\": \"0.1.0\"" を含む

## Scenario: 数式描画の正本を案内する

- Then リポジトリファイル "CONTEXT.md" は "数式描画コードの正本は pi-formula" を含む

## Scenario: Pi パッケージの確認手順は pi-formula と `/formula` を案内する

- Then リポジトリファイル "docs/pi-package.md" は "`pi-formula` の `/formula`" を含む

## Scenario: 互換性変更を案内する

- Then リポジトリファイル "docs/releases/formula-migration-0.2.0.md" は "`/math` は使えません" を含む

## Scenario: Ghostty と Kitty の実端末確認結果を記録する

- Then リポジトリファイル "docs/releases/formula-migration-0.2.0.md" は "Ghostty と Kitty の両方" を含む
