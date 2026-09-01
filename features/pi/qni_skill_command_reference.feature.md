# Feature: qni スキルのコマンド仕様

量子回路AI共同研究者として
ヘルプ確認を繰り返さず qni-cli を正しく使うために
スキル内で主要コマンドの現行仕様を確認したい

## Scenario: スキルの主要コマンド仕様は CLI ヘルプと一致する

- Then qni スキルのコマンド仕様にある名前とオプションは CLI ヘルプに存在する

## Scenario: 既知の仕様ではヘルプを実行しない

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "そこに書かれた範囲では `--help` を実行しない" を含む

## Scenario: 依存するコマンド列の引数形式を例示する

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "\"commands\": [" を含む

## Scenario: 誤った args の直し方を例示する

- Then リポジトリファイル "skills/qni-cli/SKILL.md" は "コマンド全体を1つの引数として渡すため失敗する" を含む

## Scenario: run の既定出力を測定の有無で区別する

- Then リポジトリファイル "skills/qni-cli/references/commands.md" は "測定を含まない回路では数値の状態ベクトルを、測定回路では1回分の測定結果を表示する" を含む

## Scenario: 円表記 PNG の依存を区別する

- Then リポジトリファイル "skills/qni-cli/references/commands.md" は "円表記 PNG には matplotlib と Pillow が必要になる" を含む
