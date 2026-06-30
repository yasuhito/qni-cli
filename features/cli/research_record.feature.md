# Feature: qni research record

qni-cli の利用者として
外部の共同研究者が作ったプロンプト、AI回答、提出物群を研究ログに残すために
qni research record で合格した研究試行を記録したい。

## Background:

- Given 作業ディレクトリに "prompt.md" を作る:

  ```md
  Quantum Katas のスモークセットを `.qni` 形式で解いてください。
  ```

- Given 作業ディレクトリに "response.md" を作る:

  ```md
  提出物ディレクトリに各課題の `.qni` ファイルを保存しました。
  ```

## Scenario: 合格する研究試行記録コマンドは成功する

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then コマンドは成功

## Scenario: 研究試行ディレクトリ名は UTC 秒精度タイムスタンプと slug で作られる

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then UTC秒精度タイムスタンプと slug "smoke-claude" の研究試行ディレクトリが作られる

## Scenario: trial.md が作られる

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then 研究試行ファイル "trial.md" が作られる

## Scenario: metadata.json が作られる

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then 研究試行ファイル "metadata.json" が作られる

## Scenario: prompt.md がコピーされる

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then 研究試行ファイル "prompt.md" は "Quantum Katas のスモークセット" を含む

## Scenario: response.md がコピーされる

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then 研究試行ファイル "response.md" は "提出物ディレクトリ" を含む

## Scenario: submissions ディレクトリがコピーされる

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then 研究試行ディレクトリ "submissions" が作られる

## Scenario: result.json が作られる

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then 研究試行ファイル "result.json" が作られる

## Scenario: result.json は合格したスイート採点結果を保存する

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then 研究試行 JSON ファイル "result.json" の "status" は "passed"

## Scenario: metadata.json は passed を示す

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then 研究試行 JSON ファイル "metadata.json" の "status" は "passed"

## Scenario: trial.md は passed を示す

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then 研究試行ファイル "trial.md" は "- status: passed" を含む

## Scenario: 不正な slug は終了コード 3 で拒否される

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug Smoke_Claude" を実行
- Then 終了コードは 3

## Scenario: 不正な slug は原因と指定し直し方を表示する

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug Smoke_Claude" を実行
- Then 標準エラーに次を含む:

  ```text
  Invalid --slug: Smoke_Claude
  Use lowercase letters, digits, and hyphens between words
  ```

## Scenario: 不正な slug では研究試行ディレクトリを作らない

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug ../escape" を実行
- Then 研究試行ディレクトリは作られない

## Scenario Outline: 欠けている入力は終了コード 3 で拒否される

- When "qni research record --collaborator claude-sonnet-4 --benchmark <benchmark> --submissions <submissions> --prompt <prompt> --response <response> --slug smoke-claude" を実行
- Then 終了コードは 3

### Examples:

  | benchmark                | submissions                         | prompt            | response            |
  | missing-benchmark        | benchmarks/solutions/quantum-katas | prompt.md         | response.md         |
  | benchmarks/quantum-katas | missing-submissions                 | prompt.md         | response.md         |
  | benchmarks/quantum-katas | benchmarks/solutions/quantum-katas | missing-prompt.md | response.md         |
  | benchmarks/quantum-katas | benchmarks/solutions/quantum-katas | prompt.md         | missing-response.md |

## Scenario Outline: 欠けている入力では研究試行ディレクトリを作らない

- When "qni research record --collaborator claude-sonnet-4 --benchmark <benchmark> --submissions <submissions> --prompt <prompt> --response <response> --slug smoke-claude" を実行
- Then 研究試行ディレクトリは作られない

### Examples:

  | benchmark                | submissions                         | prompt            | response            |
  | missing-benchmark        | benchmarks/solutions/quantum-katas | prompt.md         | response.md         |
  | benchmarks/quantum-katas | missing-submissions                 | prompt.md         | response.md         |
  | benchmarks/quantum-katas | benchmarks/solutions/quantum-katas | missing-prompt.md | response.md         |
  | benchmarks/quantum-katas | benchmarks/solutions/quantum-katas | prompt.md         | missing-response.md |

## Scenario Outline: 欠けている入力は原因と指定し直し方を表示する

- When "qni research record --collaborator claude-sonnet-4 --benchmark <benchmark> --submissions <submissions> --prompt <prompt> --response <response> --slug smoke-claude" を実行
- Then 標準エラーに次を含む:

  ```text
  <message>
  <suggestion>
  ```

### Examples:

  | benchmark                | submissions                         | prompt            | response            | message                                                     | suggestion                                            |
  | missing-benchmark        | benchmarks/solutions/quantum-katas | prompt.md         | response.md         | Benchmark suite directory does not exist: missing-benchmark | Create the directory or pass a different --benchmark path.  |
  | benchmarks/quantum-katas | missing-submissions                 | prompt.md         | response.md         | Submissions directory does not exist: missing-submissions    | Create the directory or pass a different --submissions path. |
  | benchmarks/quantum-katas | benchmarks/solutions/quantum-katas | missing-prompt.md | response.md         | Prompt file does not exist: missing-prompt.md               | Create the file or pass a different --prompt path.          |
  | benchmarks/quantum-katas | benchmarks/solutions/quantum-katas | prompt.md         | missing-response.md | AI response file does not exist: missing-response.md        | Create the file or pass a different --response path.        |

## Scenario: 保存先の研究試行ディレクトリが既にある場合は終了コード 3 で拒否される

- Given slug "smoke-claude" の保存先候補に既存の研究試行がある
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then 終了コードは 3

## Scenario: 保存先の研究試行ディレクトリが既にある場合は別の slug を案内する

- Given slug "smoke-claude" の保存先候補に既存の研究試行がある
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then 標準エラーに次を含む:

  ```text
  Choose a different --slug
  ```

## Scenario: 保存先の研究試行ディレクトリが既にある場合は既存の研究試行を変更しない

- Given slug "smoke-claude" の保存先候補に既存の研究試行がある
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt prompt.md --response response.md --slug smoke-claude" を実行
- Then 研究試行ディレクトリ一覧は変わらない

## Scenario: 入力検証に失敗した場合は既存の研究試行ファイルを変更しない

- Given 作業ディレクトリに "research/runs/existing-trial/trial.md" を作る:

  ```md
  original trial
  ```

- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions benchmarks/solutions/quantum-katas --prompt missing-prompt.md --response response.md --slug smoke-claude" を実行
- Then 作業ディレクトリのファイル "research/runs/existing-trial/trial.md" は "original trial" を含む
