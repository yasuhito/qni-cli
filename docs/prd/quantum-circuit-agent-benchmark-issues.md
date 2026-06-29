# 量子回路AIエージェント評価基盤 issue 分割案

## 分割方針

PRDは、次の方針で issue に分割する。

- 各 issue は、できるだけ小さく、レビューしやすい技術要素に分ける。
- ただし、作業木を常に通る状態に保つため、純粋に失敗する feature だけを追加する issue は作らない。
- 新しい振る舞いを実装する issue では、その issue の中で先に feature シナリオを追加し、その後に実装して通す。
- 実装順序は、課題データ → CLI最小縦断 → 検証能力 → 安全性 → JSON → 仕上げ、の順にする。

## Issue 1: Quantum Katas 由来のスモーク課題ファイルを追加する

### 目的

MVPで使う評価データを先にリポジトリへ追加する。

### 作業内容

- `benchmarks/quantum-katas/basic-gates/state-flip.md` を追加する。
- `benchmarks/quantum-katas/superposition/plus-state.md` を追加する。
- `benchmarks/quantum-katas/superposition/bell-state.md` を追加する。
- 各ファイルは Markdown + YAML frontmatter とする。
- frontmatter には `id`, `title`, `source`, `difficulty`, `allowed_commands`, `checks` を含める。

### 受け入れ条件

- 3つの課題ファイルが存在する。
- 各課題ファイルに、PRDで定義した frontmatter 項目が含まれる。
- 課題本文から、AIエージェントが何を作るべきか分かる。

## Issue 2: `.qni` 標準解・失敗サンプル・プロンプトを追加する

### 目的

評価ランナーに渡す提出物ファイルと、AI用の最小プロンプトを用意する。

### 作業内容

- `benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni` を追加する。
- `benchmarks/solutions/quantum-katas/superposition/plus-state.qni` を追加する。
- `benchmarks/solutions/quantum-katas/superposition/bell-state.qni` を追加する。
- `benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni` を追加する。
- `benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni` を追加する。
- `benchmarks/prompts/qni-solution.md` を追加する。

### 受け入れ条件

- 標準解は、すべて1行1コマンドの `.qni` 形式である。
- 各行は `qni ...` で始まる完全なCLIコマンドである。
- 不正解サンプルと不許可サンプルが、標準解とは別ディレクトリにある。

## Issue 3: `qni benchmark run` の最小合格ケースを実装する

### 目的

最初の縦断スライスとして、1つの課題と1つの標準解を評価し、合格判定できるようにする。

### 作業内容

- `features/cli/benchmark_run.feature.md` に合格ケースを追加する。
- `qni benchmark run <task-file> <submission-file>` をCLIに追加する。
- 課題ファイルから frontmatter を読み取る最小実装を追加する。
- `.qni` 提出物を読み取る。
- 課題ごとに一時ディレクトリを作る。
- 提出された `qni` コマンド列を一時ディレクトリで実行する。
- `run` check を実行し、期待状態と比較する。
- 合格時に終了コード `0` を返す。

### 受け入れ条件

- `state-flip.md` と `state-flip.qni` を指定した `qni benchmark run` が成功する。
- 開発中の作業ディレクトリに `circuit.json` が残らない。
- 合格時の人間向け出力が表示される。

## Issue 4: `expect` check と BellState 合格ケースを実装する

### 目的

状態ベクトル比較だけでなく、期待値比較でも課題を検証できるようにする。

### 作業内容

- `features/cli/benchmark_run.feature.md` に `expect` check の合格ケースを追加する。
- `checks.items[].type: expect` を解釈する。
- `qni expect` を実行し、期待値を `tolerance` で比較する。
- `bell-state.md` と `bell-state.qni` を合格させる。

### 受け入れ条件

- `bell-state.md` と `bell-state.qni` を指定した `qni benchmark run` が成功する。
- `run` check と `expect` check の両方を扱える。

## Issue 5: 不合格判定と終了コード `1` を実装する

### 目的

許可された提出物だが量子回路として誤っている場合に、不合格として判定する。

### 作業内容

- `features/cli/benchmark_run.feature.md` に失敗ケースを追加する。
- `benchmarks/incorrect/.../state-flip-wrong.qni` を評価できるようにする。
- check が期待値と一致しない場合、`status: failed` として扱う。
- 終了コード `1` を返す。

### 受け入れ条件

- 不正解サンプルを指定すると、`qni benchmark run` が終了コード `1` で終了する。
- 人間向け出力で、少なくともどの check が失敗したか分かる。

## Issue 6: 不許可コマンド拒否と終了コード `2` を実装する

### 目的

AIが生成した `.qni` 提出物に、課題で許可されていないコマンドが含まれる場合、安全に拒否する。

### 作業内容

- `features/cli/benchmark_run.feature.md` に不許可コマンド拒否ケースを追加する。
- 課題ファイルの `allowed_commands` を解釈する。
- `.qni` の各行が、許可された `qni` サブコマンドだけを使っているか検査する。
- 不許可コマンドを検出した場合、提出コマンドを実行せずに拒否する。
- `status: disallowed` とし、終了コード `2` を返す。

### 受け入れ条件

- 不許可サンプルを指定すると、`qni benchmark run` が終了コード `2` で終了する。
- 不許可コマンドは実行されない。
- 人間向け出力で、どの行またはコマンドが拒否されたか分かる。

## Issue 7: `--json` 出力を実装する

### 目的

評価結果を、将来の集計、公開研究ログ、複数モデル比較に使える構造化形式で出力する。

### 作業内容

- `features/cli/benchmark_run.feature.md` に `--json` 出力ケースを追加する。
- `qni benchmark run <task-file> <submission-file> --json` を実装する。
- `taskId`, `title`, `submission`, `status`, `exitCode`, `checks` を含むJSONを出力する。
- `status` は `passed`, `failed`, `disallowed`, `error` のいずれかにする。

### 受け入れ条件

- 合格ケースで、`--json` が妥当なJSONを出力する。
- 不合格ケースと不許可ケースでも、対応する `status` と `exitCode` がJSONに含まれる。

## Issue 8: 実行エラー処理と終了コード `3` を固める

### 目的

課題ファイル不正、提出物の構文不正、`qni` 実行失敗などを、通常の不合格や不許可と区別する。

### 作業内容

- frontmatter が欠けている課題ファイルをエラーにする。
- `.qni` の行が `qni` で始まらない場合をエラーまたは不許可として整理する。
- `qni` コマンド実行が異常終了した場合を `status: error` とする。
- 終了コード `3` を返す。

### 受け入れ条件

- 入力ファイル不備や実行エラーが、終了コード `3` として扱われる。
- 不合格 `1`、不許可 `2`、実行エラー `3` が混同されない。

## Issue 9: MVP受け入れ条件をまとめて検証する

### 目的

PRDのMVP成功条件を、エンドツーエンドで確認する。

### 作業内容

- 3つの標準解がすべて合格することを確認する。
- 不正解サンプルが不合格になることを確認する。
- 不許可サンプルが拒否されることを確認する。
- `--json` 出力が合格、不合格、不許可の各ケースで機械処理可能であることを確認する。
- READMEまたはPRDから、実行方法が追えるように必要最小限の案内を追加する。

### 受け入れ条件

- `bundle exec rake check` が成功する。
- PRDのMVP成功条件がすべて満たされる。
- 次の段階で GitHub Pages、公開研究ログ、外部ベンチマーク移植へ進める状態になっている。
