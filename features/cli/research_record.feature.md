# Feature: qni research record

qni-cli の利用者として
外部の共同研究者が作ったプロンプト、AI回答、提出物群を研究ログに残すために
qni research record で研究試行を記録したい。

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

## Scenario: failed の研究試行記録コマンドは終了コード 1 を返す

- Given 作業ディレクトリに採点状態 "failed" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug failed-claude" を実行
- Then 終了コードは 1

## Scenario: disallowed の研究試行記録コマンドは終了コード 2 を返す

- Given 作業ディレクトリに採点状態 "disallowed" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug disallowed-claude" を実行
- Then 終了コードは 2

## Scenario: error の研究試行記録コマンドは終了コード 3 を返す

- Given 作業ディレクトリに採点状態 "error" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug error-claude" を実行
- Then 終了コードは 3

## Scenario: failed でも研究試行ディレクトリが作られる

- Given 作業ディレクトリに採点状態 "failed" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug failed-claude" を実行
- Then UTC秒精度タイムスタンプと slug "failed-claude" の研究試行ディレクトリが作られる

## Scenario: disallowed でも研究試行ディレクトリが作られる

- Given 作業ディレクトリに採点状態 "disallowed" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug disallowed-claude" を実行
- Then UTC秒精度タイムスタンプと slug "disallowed-claude" の研究試行ディレクトリが作られる

## Scenario: error でも研究試行ディレクトリが作られる

- Given 作業ディレクトリに採点状態 "error" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug error-claude" を実行
- Then UTC秒精度タイムスタンプと slug "error-claude" の研究試行ディレクトリが作られる

## Scenario: failed の result.json は採点状態を保存する

- Given 作業ディレクトリに採点状態 "failed" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug failed-claude" を実行
- Then 研究試行 JSON ファイル "result.json" の "status" は "failed"

## Scenario: disallowed の result.json は採点状態を保存する

- Given 作業ディレクトリに採点状態 "disallowed" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug disallowed-claude" を実行
- Then 研究試行 JSON ファイル "result.json" の "status" は "disallowed"

## Scenario: error の result.json は採点状態を保存する

- Given 作業ディレクトリに採点状態 "error" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug error-claude" を実行
- Then 研究試行 JSON ファイル "result.json" の "status" は "error"

## Scenario: failed の metadata.json は採点状態を示す

- Given 作業ディレクトリに採点状態 "failed" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug failed-claude" を実行
- Then 研究試行 JSON ファイル "metadata.json" の "status" は "failed"

## Scenario: disallowed の metadata.json は採点状態を示す

- Given 作業ディレクトリに採点状態 "disallowed" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug disallowed-claude" を実行
- Then 研究試行 JSON ファイル "metadata.json" の "status" は "disallowed"

## Scenario: error の metadata.json は採点状態を示す

- Given 作業ディレクトリに採点状態 "error" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug error-claude" を実行
- Then 研究試行 JSON ファイル "metadata.json" の "status" は "error"

## Scenario: failed の trial.md は採点状態を示す

- Given 作業ディレクトリに採点状態 "failed" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug failed-claude" を実行
- Then 研究試行ファイル "trial.md" は "- status: failed" を含む

## Scenario: disallowed の trial.md は採点状態を示す

- Given 作業ディレクトリに採点状態 "disallowed" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug disallowed-claude" を実行
- Then 研究試行ファイル "trial.md" は "- status: disallowed" を含む

## Scenario: error の trial.md は採点状態を示す

- Given 作業ディレクトリに採点状態 "error" の Quantum Katas 提出物群 "submissions" を作る
- When "qni research record --collaborator claude-sonnet-4 --benchmark benchmarks/quantum-katas --submissions submissions --prompt prompt.md --response response.md --slug error-claude" を実行
- Then 研究試行ファイル "trial.md" は "- status: error" を含む
