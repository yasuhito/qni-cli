# Feature: qni research solve を隔離した Claude Bridge 経由で実行する

qni-cli の利用者として
Claude Code のサブスクリプションで動く Claude Bridge のモデルを、利用者の個人設定を混ぜずに評価するために
明示した Claude Bridge 拡張機能だけを読み込み、プロバイダーとモデルを完全一致で固定して研究試行へ保存したい。

## Background:

- Given 作業ディレクトリに solve 用の2課題ベンチマークスイート "benchmarks/smoke" を作る
- Given 偽 Pi は Claude Bridge 拡張機能 "bridge/src/index.ts" でモデル "claude-bridge/claude-opus-5-5" を提供する
- Given 偽 Pi はプロバイダー "anthropic" のモデル "claude-opus-5-5" も提供する

## Scenario: Claude Bridge の課題を研究試行として保存する

- When "qni research solve --provider claude-bridge --model claude-opus-5-5 --claude-bridge-extension bridge/src/index.ts --thinking high --benchmark benchmarks/smoke --task smoke/state-flip --slug bridge" を実行
- Then コマンドは成功

## Scenario: 課題呼び出しは明示した Claude Bridge 拡張機能だけを読み込む

- When "qni research solve --provider claude-bridge --model claude-opus-5-5 --claude-bridge-extension bridge/src/index.ts --thinking high --benchmark benchmarks/smoke --task smoke/state-flip --slug bridge" を実行
- Then 偽 Pi の課題呼び出しは Claude Bridge 拡張機能 "bridge/src/index.ts" とプロバイダー "claude-bridge" のモデル "claude-opus-5-5" を指定する

## Scenario: 課題呼び出しは道具や文脈なしに実行される

- When "qni research solve --provider claude-bridge --model claude-opus-5-5 --claude-bridge-extension bridge/src/index.ts --thinking high --benchmark benchmarks/smoke --task smoke/state-flip --slug bridge" を実行
- Then 偽 Pi の課題呼び出しは Claude Bridge の隔離オプションをすべて含む

## Scenario: 課題の作業場所で Claude Code の設定読み込み元を空にする

- When "qni research solve --provider claude-bridge --model claude-opus-5-5 --claude-bridge-extension bridge/src/index.ts --thinking high --benchmark benchmarks/smoke --task smoke/state-flip --slug bridge" を実行
- Then 偽 Pi の課題呼び出し時の Claude Bridge 設定は次の JSON と等しい:

  ```json
  {
    "provider": {
      "settingSources": []
    }
  }
  ```

## Scenario: Claude Code 子プロセスの再試行と代替モデルを無効にする

- When "qni research solve --provider claude-bridge --model claude-opus-5-5 --claude-bridge-extension bridge/src/index.ts --thinking high --benchmark benchmarks/smoke --task smoke/state-flip --slug bridge" を実行
- Then 偽 Pi の課題呼び出しは Claude Code の再試行と代替モデルを無効にする

## Scenario: 実行条件を研究試行に保存する

- When "qni research solve --provider claude-bridge --model claude-opus-5-5 --claude-bridge-extension bridge/src/index.ts --thinking high --benchmark benchmarks/smoke --task smoke/state-flip --slug bridge" を実行
- Then 研究試行 JSON ファイル "metadata.json" は次の部分 JSON を含む:

  ```json
  {
    "model": {
      "id": "claude-opus-5-5",
      "provider": "claude-bridge"
    },
    "generation": {
      "thinking": "high"
    },
    "harness": {
      "runner": "pi-claude-bridge",
      "submissionProtocol": "blind-neutral-circuit-json-v1",
      "claudeBridge": {
        "settingSources": [],
        "systemPrompt": "claude_code-preset-with-appended-task-system-prompt"
      }
    }
  }
  ```

## Scenario: 応答プロバイダーが指定と異なる課題は部分記録に error として保存する

- Given 偽 Pi は応答プロバイダー "anthropic" を返す
- When "qni research solve --provider claude-bridge --model claude-opus-5-5 --claude-bridge-extension bridge/src/index.ts --thinking high --benchmark benchmarks/smoke --task smoke/state-flip --slug bridge" を実行
- Then 部分記録の最初の呼び出しエラーは "Pi responded with a different provider: requested claude-bridge, received anthropic"

## Scenario: settingSources を検証しない Claude Bridge では研究試行を作らない

- Given 偽 Pi の Claude Bridge は settingSources を検証しない
- When "qni research solve --provider claude-bridge --model claude-opus-5-5 --claude-bridge-extension bridge/src/index.ts --thinking high --benchmark benchmarks/smoke --task smoke/state-flip --slug bridge" を実行
- Then 研究試行ディレクトリは作られない

## Scenario: settingSources を検証しない Claude Bridge は Pi 準備エラーになる

- Given 偽 Pi の Claude Bridge は settingSources を検証しない
- When "qni research solve --provider claude-bridge --model claude-opus-5-5 --claude-bridge-extension bridge/src/index.ts --thinking high --benchmark benchmarks/smoke --task smoke/state-flip --slug bridge" を実行
- Then 終了コードは 3

## Scenario: 指定プロバイダーにモデルが無ければ同名モデルへ切り替えない

- Given 偽 Pi はプロバイダー "anthropic" のモデル "claude-sonnet-5-5" も提供する
- When "qni research solve --provider claude-bridge --model claude-sonnet-5-5 --claude-bridge-extension bridge/src/index.ts --thinking high --benchmark benchmarks/smoke --task smoke/state-flip --slug bridge" を実行
- Then 研究試行ディレクトリは作られない

## Scenario: Claude Bridge 拡張機能はプロバイダー claude-bridge の指定を必要とする

- When "qni research solve --model claude-opus-5-5 --claude-bridge-extension bridge/src/index.ts --thinking high --benchmark benchmarks/smoke --task smoke/state-flip --slug bridge" を実行
- Then 終了コードは 3

## Scenario: 存在しない Claude Bridge 拡張機能は入力エラーになる

- When "qni research solve --provider claude-bridge --model claude-opus-5-5 --claude-bridge-extension missing/index.ts --thinking high --benchmark benchmarks/smoke --task smoke/state-flip --slug bridge" を実行
- Then 終了コードは 3
