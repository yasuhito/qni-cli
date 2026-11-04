# Feature: モデル筆記試験を再試行せず実行エラーで止める

qni-cli の利用者として
認証や利用上限のエラー後に追加のモデル呼び出しを送らないために
再試行を無効にして、最初の実行エラーで停止し、試みた課題の部分記録だけを残したい。

## Background:

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- Given 偽 Pi はモデル "fake-qni" を利用可能として報告する

## Scenario: 自作の課題ディレクトリだけを承認して再試行を無効にする

- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug safety" を実行
- Then 偽 Pi の課題呼び出しは安全な実行設定だけを承認する

## Scenario: 課題ごとの1時間上限を実行条件として保存する

- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug safety" を実行
- Then 研究試行 JSON ファイル "metadata.json" は次の部分 JSON を含む:

  ```json
  { "harness": { "piTaskTimeoutMs": 3600000 } }
  ```

## Scenario: 明示しない場合も事前確認したプロバイダーを呼び出しに指定する

- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug safety" を実行
- Then 偽 Pi の課題呼び出しは拡張機能を読み込まずにプロバイダー "fake-provider" のモデル "fake-qni" を指定する

## Scenario: 最初の実行エラーで後続の課題を呼ばない

- Given 偽 Pi は1回目の課題呼び出しだけ失敗する
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug safety" を実行
- Then 偽 Pi の課題呼び出し回数は 1

## Scenario: 本文付きの上限エラーでも正式な研究試行を作らない

- Given 偽 Pi は停止理由 "error" とエラー "QNI_DUMMY_QUOTA" を返す
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug safety" を実行
- Then 研究試行ディレクトリは作られない

## Scenario: 本文付きの上限エラーの理由を保持する

- Given 偽 Pi は停止理由 "error" とエラー "QNI_DUMMY_QUOTA" を返す
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug safety" を実行
- Then 部分記録の最初の呼び出しエラーは "Pi execution error: QNI_DUMMY_QUOTA"

## Scenario: 中断された応答でも後続の課題を呼ばない

- Given 偽 Pi は停止理由 "aborted" とエラー "QNI_DUMMY_ABORT" を返す
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug safety" を実行
- Then 偽 Pi の課題呼び出し回数は 1

## Scenario: 部分記録には試みた課題だけを含める

- Given 偽 Pi は2回目の課題呼び出しだけ失敗する
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug safety" を実行
- Then 部分記録は成功した1課題と実行エラーの1課題を保持する

## Scenario: 不正な JSONL でも後続の課題を呼ばない

- Given 偽 Pi は不正な JSONL を返す
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug safety" を実行
- Then 部分記録の最初の呼び出しエラーは "Pi returned invalid JSONL"

## Scenario: 不許可の回路回答では後続の課題を呼ぶ

- Given 偽 Pi は最終回答 "回路 JSON ではない回答" を返す
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug safety" を実行
- Then 偽 Pi の課題呼び出し回数は 2

## Scenario: 明示しない場合も事前確認した応答プロバイダーを固定する

- Given 偽 Pi は応答プロバイダー "other-provider" を返す
- When "qni research solve --model fake-qni --thinking max --benchmark benchmarks/smoke --slug safety" を実行
- Then 偽 Pi の課題呼び出し回数は 1
