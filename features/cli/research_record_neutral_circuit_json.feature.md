# Feature: qni research record の中立回路 JSON 入力

qni-cli の利用者として
外部の共同研究者が qni-cli 固有形式を知らずに作った中立 JSON 提出を研究ログに残すために
qni research record で中立 JSON を記録・変換・採点したい。

## Background:

- Given 作業ディレクトリに "prompt.md" を作る:

  ```md
  中立回路 JSON 形式で解いてください。
  ```

- Given 作業ディレクトリに "response.md" を作る:

  ```md
  各課題の JSON ファイルを保存しました。
  ```

- Given 作業ディレクトリに "benchmark/basic/state-flip.md" を作る:

  ```md
  ---
  id: smoke/state-flip
  title: Smoke State Flip
  source: qni-cli cucumber
  difficulty: smoke
  available_gates:
    - X(target)
  allowed_commands:
    - qni add
  checks:
    tolerance: 1e-9
    items:
      - type: run
        expected:
          - basis: "|1>"
            amplitude:
              real: 1
              imaginary: 0
  ---

  1量子ビットを |1> にしてください。
  ```

- Given 作業ディレクトリに "circuit-json/basic/state-flip.json" を作る:

  ```json
  {"operations":[{"gate":"X","targets":[0]}]}
  ```

## Scenario: 中立 JSON の研究試行記録コマンドは成功する

- When "qni research record --collaborator external-agent --benchmark benchmark --circuit-json-dir circuit-json --prompt prompt.md --response response.md --slug neutral-json" を実行
- Then コマンドは成功

## Scenario: 中立 JSON 入力は元の circuit-json ディレクトリとして保存される

- When "qni research record --collaborator external-agent --benchmark benchmark --circuit-json-dir circuit-json --prompt prompt.md --response response.md --slug neutral-json" を実行
- Then 研究試行ディレクトリ "circuit-json" が作られる

## Scenario: 中立 JSON 入力は変換後の submissions ディレクトリとして保存される

- When "qni research record --collaborator external-agent --benchmark benchmark --circuit-json-dir circuit-json --prompt prompt.md --response response.md --slug neutral-json" を実行
- Then 研究試行ディレクトリ "submissions" が作られる

## Scenario: 中立 JSON 入力の採点結果が保存される

- When "qni research record --collaborator external-agent --benchmark benchmark --circuit-json-dir circuit-json --prompt prompt.md --response response.md --slug neutral-json" を実行
- Then 研究試行 JSON ファイル "result.json" の "status" は "passed"

## Scenario: 中立 JSON 入力の metadata.json は提出プロトコルを保存する

- When "qni research record --collaborator external-agent --benchmark benchmark --circuit-json-dir circuit-json --prompt prompt.md --response response.md --slug neutral-json" を実行
- Then 研究試行 JSON ファイル "metadata.json" の "submissionProtocol" は "blind-neutral-circuit-json-v1"

## Scenario: 不正な中立 JSON 提出でも disallowed の研究試行として保存される

- Given 作業ディレクトリに "circuit-json/basic/state-flip.json" を作る:

  ```json
  {"operations":[{"gate":"RX","angle":"pi/2","targets":[0]}]}
  ```

- When "qni research record --collaborator external-agent --benchmark benchmark --circuit-json-dir circuit-json --prompt prompt.md --response response.md --slug invalid-neutral-json" を実行
- Then 研究試行 JSON ファイル "result.json" は次の部分 JSON を含む:

  ```json
  {
    "status": "disallowed",
    "results": [
      {
        "status": "disallowed"
      }
    ]
  }
  ```

## Scenario: .qni 提出物と中立 JSON 提出物の両方指定は終了コード 3 で拒否される

- When "qni research record --collaborator external-agent --benchmark benchmark --submissions submissions --circuit-json-dir circuit-json --prompt prompt.md --response response.md --slug duplicate-inputs" を実行
- Then 終了コードは 3
