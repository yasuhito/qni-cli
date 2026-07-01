# Feature: 研究試行レポート reader

qni-cli の保守者として
保存済み研究試行から研究試行レポートを作るために
研究試行候補を valid / invalid として読み取りたい。

## Scenario: runs ディレクトリが無い場合は空の一覧を返す

- When 研究試行レポート reader で研究試行を読み取る
- Then 読み取った研究試行数は 0

## Scenario: 直下のファイルは研究試行候補にしない

- Given 有効な研究試行 "2026-06-30T123456Z-smoke-claude" を研究ログに保存済み
- Given 作業ディレクトリに "research/runs/README.txt" を作る:

  ```text
  note
  ```

- When 研究試行レポート reader で研究試行を読み取る
- Then 読み取った研究試行ID一覧は:

  ```text
  2026-06-30T123456Z-smoke-claude
  ```

## Scenario: 研究試行候補は新しい順で返る

- Given 有効な研究試行 "2026-06-30T123456Z-older" を研究ログに保存済み
- Given 有効な研究試行 "2026-07-01T000001Z-newer" を研究ログに保存済み
- When 研究試行レポート reader で研究試行を読み取る
- Then 読み取った研究試行ID一覧は:

  ```text
  2026-07-01T000001Z-newer
  2026-06-30T123456Z-older
  ```

## Scenario: 壊れた研究試行候補も invalid として残す

- Given 無効な研究試行候補 "broken-trial" を研究ログに保存済み
- When 研究試行レポート reader で研究試行を読み取る
- Then 読み取った研究試行 "broken-trial" の status は "invalid"

## Scenario: 壊れた研究試行候補は invalidReason を持つ

- Given 無効な研究試行候補 "broken-trial" を研究ログに保存済み
- When 研究試行レポート reader で研究試行を読み取る
- Then 読み取った研究試行 "broken-trial" の invalidReason は "invalid research trial id" を含む
