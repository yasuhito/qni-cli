# Feature: 説明の途中では回路を画像で見せる

量子の説明を読む人として
説明文の途中に自分で描いた回路のアスキーアートではなく
qni view の画像回路図を見たい

## Scenario: システム指示の要約は回路を view の画像で見せる

- Given 偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When 登録された qni ツールを確認する
- Then qni ツールの promptSnippet は view の画像回路図を説明する

## Scenario: システム指示は説明文のコードブロックで回路を描かない

- Given 偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When 登録された qni ツールを確認する
- Then qni ツールの promptGuidelines は text コードブロックの回路アスキーアートを禁じる

## Scenario: システム指示の英語でも説明文のコードブロックで回路を描かない

- Given 偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When 登録された qni ツールを確認する
- Then qni ツールの promptGuidelines は英語で text コードブロックの回路アスキーアートを禁じる

## Scenario: システム指示は回路を qni view の画像で見せる

- Given 偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When 登録された qni ツールを確認する
- Then qni ツールの promptGuidelines は qni view の画像回路図を指示する

## Scenario: ツール説明は説明文のコードブロックで回路を描かない

- Given 偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When 登録された qni ツールを確認する
- Then qni ツールの説明は text コードブロックの回路アスキーアートを禁じる

## Scenario: ツール説明は回路を view の画像で見せる

- Given 偽の Pi ExtensionAPI に qni ツール拡張を登録する
- When 登録された qni ツールを確認する
- Then qni ツールの説明は view の画像回路図を指示する

## Scenario: スキルは説明文のコードブロックで回路を描かない

- Then スキルは text コードブロックの回路アスキーアートを禁じる

## Scenario: スキルの説明は画像の回路図を使う

- Then リポジトリファイル "skills/qni-cli/SKILL.md" の frontmatter description は "説明文のコードブロックへ回路のアスキーアートを描かず、qni view の画像回路図を使う" を含む
