# Feature: 共同研究者が qni の数式結果を引用する

共同研究者（量子回路AIエージェント）として
計算結果を書き換えず研究者へ見せるために
専用ツールの LaTeX 出力を数式として引用したい

## Scenario: 専用 qni ツールを優先する

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "専用の `qni` ツールを優先する" を含む

## Scenario: 状態ベクトルと期待値を LaTeX で引用する

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "`--latex` の出力を `$$...$$` でそのまま引用する" を含む

## Scenario: 量子状態を ket 記法で書く

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "数式は `$...$` または `$$...$$` で囲み、量子状態は `\ket{}` で書く" を含む
