# Feature: 中立回路 JSON 提出の .qni 変換

Qni CoResearcher の評価ランナーとして
qni-cli 固有の提出形式を解答者に見せずに採点するために
厳格な中立 JSON 提出を内部で `.qni` コマンド列へ変換したい。

## Scenario: 中立 JSON 変換器の内部モジュールがある

- Then リポジトリファイル "src/evaluation_runner/neutral_circuit_json_submission.ts" は存在する
