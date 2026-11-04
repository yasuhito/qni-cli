# Feature: qni research solve でプロバイダーを固定する

qni-cli の利用者として
同じモデル ID を持つ別プロバイダーへ黙って切り替わらずに評価するために
--provider で指定したプロバイダーとモデルの完全一致を確かめてから研究試行へ保存したい。

## Background:

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- Given 偽 Pi はモデル "fake-qni" を利用可能として報告する
- Given 偽 Pi はプロバイダー "other-provider" のモデル "fake-qni-2" も提供する

## Scenario: プロバイダーを固定した課題を研究試行として保存する

- When "qni research solve --provider fake-provider --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug provider" を実行
- Then コマンドは成功

## Scenario: プロバイダーを固定した課題呼び出しは拡張機能を読み込まない

- When "qni research solve --provider fake-provider --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug provider" を実行
- Then 偽 Pi の課題呼び出しは拡張機能を読み込まずにプロバイダー "fake-provider" のモデル "fake-qni" を指定する

## Scenario: プロバイダーを固定した実行条件を研究試行に保存する

- When "qni research solve --provider fake-provider --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug provider" を実行
- Then 研究試行 JSON ファイル "metadata.json" は次の部分 JSON を含む:

  ```json
  {
    "model": {
      "id": "fake-qni",
      "provider": "fake-provider"
    },
    "harness": {
      "runner": "pi"
    }
  }
  ```

## Scenario: 指定プロバイダーのカタログにモデルが無ければ研究試行を作らない

- When "qni research solve --provider other-provider --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug provider" を実行
- Then 研究試行ディレクトリは作られない

## Scenario: 指定プロバイダーのカタログにモデルが無ければ Pi 準備エラーになる

- When "qni research solve --provider other-provider --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug provider" を実行
- Then 終了コードは 3

## Scenario: 応答プロバイダーが指定と異なる課題は部分記録に error として保存する

- Given 偽 Pi は応答プロバイダー "other-provider" を返す
- When "qni research solve --provider fake-provider --model fake-qni --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug provider" を実行
- Then 部分記録の最初の呼び出しエラーは "Pi responded with a different provider: requested fake-provider, received other-provider"

## Scenario: Pi のあいまい検索で見つかった別のモデル ID では研究試行を作らない

- When "qni research solve --provider fake-provider --model fake-q --thinking max --benchmark benchmarks/smoke --task smoke/state-flip --slug provider" を実行
- Then 研究試行ディレクトリは作られない
