# 量子回路AIエージェント評価基盤 vertical slice issue 案

## 位置づけ

この文書は `/to-issues` の方針に合わせ、PRDを「技術要素別」ではなく、細いが完結した tracer bullet の issue に分割した案である。

以前の `docs/prd/quantum-circuit-agent-benchmark-issues.md` は実装チェックリストとしては有用だが、agent-ready issue としては parser、executor、checks、JSON などの横割りが多い。実際に issue 化する場合は、本書のように、各 issue ができるだけエンドツーエンドで検証可能な単位になるようにする。

## 公開済み GitHub issue

- #251: https://github.com/yasuhito/qni-cli/issues/251
- #252: https://github.com/yasuhito/qni-cli/issues/252
- #253: https://github.com/yasuhito/qni-cli/issues/253
- #254: https://github.com/yasuhito/qni-cli/issues/254
- #255: https://github.com/yasuhito/qni-cli/issues/255
- #256: https://github.com/yasuhito/qni-cli/issues/256
- #257: https://github.com/yasuhito/qni-cli/issues/257
- #258: https://github.com/yasuhito/qni-cli/issues/258

## Issue 1: `StateFlip` を `qni benchmark run` で合格判定できる最小縦断を作る

### Blocked by

None - can start immediately

### User stories covered

- 評価者として、1つの量子回路課題と `.qni` 提出物を渡し、CLIで合否を確認したい。
- 開発者として、評価実行が作業ディレクトリを汚染しないことを確認したい。

### What to build

`StateFlip` 課題について、課題ファイル、標準解 `.qni`、`qni benchmark run` のCLI、frontmatter読み取り、提出コマンド実行、一時ディレクトリ実行、`qni run` による状態ベクトル検証、人間向け合格出力までを通す最小の縦断スライスを作る。

### Acceptance criteria

- [ ] `features/cli/benchmark_run.feature.md` に `StateFlip` 合格ケースがある。
- [ ] `benchmarks/quantum-katas/basic-gates/state-flip.md` がある。
- [ ] `benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni` がある。
- [ ] `qni benchmark run benchmarks/quantum-katas/basic-gates/state-flip.md benchmarks/solutions/quantum-katas/basic-gates/state-flip.qni` が終了コード `0` で成功する。
- [ ] 評価は一時ディレクトリで実行され、現在の作業ディレクトリに `circuit.json` を残さない。

## Issue 2: `PlusState` を追加し、重ね合わせ状態の `run` 検証を通す

### Blocked by

Issue 1

### User stories covered

- 評価者として、基底状態だけでなく重ね合わせ状態の生成も評価したい。

### What to build

`PlusState` 課題と標準解を追加し、`qni run` の状態ベクトル比較で、許容誤差つきの振幅比較を通せるようにする。

### Acceptance criteria

- [ ] `benchmarks/quantum-katas/superposition/plus-state.md` がある。
- [ ] `benchmarks/solutions/quantum-katas/superposition/plus-state.qni` がある。
- [ ] `qni benchmark run` で `PlusState` 標準解が終了コード `0` で成功する。
- [ ] `checks.tolerance` が課題ファイルから読み取られ、数値比較に使われる。

## Issue 3: `BellState` を追加し、`expect` 検証を通す

### Blocked by

Issue 1

### User stories covered

- 評価者として、2量子ビットのエンタングルメントを含む課題も評価したい。
- 開発者として、状態ベクトルだけでなく期待値による検証も使いたい。

### What to build

`BellState` 課題と標準解を追加し、`qni expect` を使った期待値比較を実装する。これにより、最小スモークセットが単一量子ビット、重ね合わせ、エンタングルメントを横断する。

### Acceptance criteria

- [ ] `benchmarks/quantum-katas/superposition/bell-state.md` がある。
- [ ] `benchmarks/solutions/quantum-katas/superposition/bell-state.qni` がある。
- [ ] `qni benchmark run` で `BellState` 標準解が終了コード `0` で成功する。
- [ ] `checks.items[].type: expect` が解釈される。
- [ ] `qni expect` の結果が期待値と許容誤差で比較される。

## Issue 4: 許可された誤答を不合格として判定する

### Blocked by

Issue 1

### User stories covered

- 評価者として、実行できるが量子回路として誤っている提出物を不合格にしたい。

### What to build

`StateFlip` の不正解サンプルを追加し、許可された `qni add` コマンドだけで構成された提出物でも、期待結果に一致しなければ `failed` と判定する。

### Acceptance criteria

- [ ] `benchmarks/incorrect/quantum-katas/basic-gates/state-flip-wrong.qni` がある。
- [ ] 不正解サンプルを評価すると終了コード `1` になる。
- [ ] 人間向け出力で、不合格であることと失敗した check が分かる。
- [ ] `--json` なしでも、通常のCLI利用者が結果を理解できる。

## Issue 5: 不許可コマンドを実行前に拒否する

### Blocked by

Issue 1

### User stories covered

- 評価者として、AIが生成した提出物に危険または仕様外のコマンドが含まれる場合、安全に拒否したい。

### What to build

`allowed_commands` を課題ファイルから読み取り、`.qni` 提出物の各行が許可された `qni` サブコマンドだけを使っているか検査する。不許可コマンドは実行せず、`disallowed` と判定する。

### Acceptance criteria

- [ ] `benchmarks/disallowed/quantum-katas/basic-gates/state-flip-disallowed.qni` がある。
- [ ] 不許可サンプルを評価すると終了コード `2` になる。
- [ ] 不許可コマンドは実行されない。
- [ ] 人間向け出力で、拒否された行またはコマンドが分かる。

## Issue 6: `--json` で合格・不合格・不許可を機械処理可能に出力する

### Blocked by

Issue 3, Issue 4, Issue 5

### User stories covered

- 評価者として、評価結果を後で集計、公開研究ログ、複数モデル比較に使える形式で取得したい。

### What to build

`qni benchmark run --json` を実装し、合格、不合格、不許可の各ケースで、`taskId`, `title`, `submission`, `status`, `exitCode`, `checks` を含むJSONを出力する。

### Acceptance criteria

- [ ] 合格ケースで `status: passed`, `exitCode: 0` のJSONが出る。
- [ ] 不合格ケースで `status: failed`, `exitCode: 1` のJSONが出る。
- [ ] 不許可ケースで `status: disallowed`, `exitCode: 2` のJSONが出る。
- [ ] 出力は妥当なJSONとして parse できる。

## Issue 7: 実行エラーを `error` と終了コード `3` に分類する

### Blocked by

Issue 1

### User stories covered

- 評価者として、課題ファイル不備や実行時エラーを、通常の不合格や不許可と区別したい。

### What to build

frontmatter不備、提出物の構文不備、`qni` 実行失敗などを `error` として扱い、終了コード `3` を返す。これにより、評価対象の誤答と、評価基盤または提出形式の異常を区別する。

### Acceptance criteria

- [ ] 不正な課題ファイルまたは提出物で終了コード `3` になる。
- [ ] `failed`, `disallowed`, `error` が人間向け出力で区別される。
- [ ] `--json` 実装後は `status: error`, `exitCode: 3` として出力できる。

## Issue 8: `.qni` 生成用プロンプトとMVP利用手順を整える

### Blocked by

Issue 6

### User stories covered

- AIエージェント利用者として、課題ファイルから `.qni` 提出物を作る標準手順を知りたい。
- 開発者として、MVPの実行方法を後から再現したい。

### What to build

AIに `.qni` を生成させる最小プロンプトテンプレートと、MVPスモークセットの実行手順を追加する。評価ランナー自体はAIを呼び出さないが、人間、Pi、Codex、Claudeなどが同じ条件で提出物を作れるようにする。

### Acceptance criteria

- [ ] `benchmarks/prompts/qni-solution.md` がある。
- [ ] プロンプトは、課題本文を読み、`.qni` 形式だけで回答することを明示する。
- [ ] 3問の標準解、不正解、不許可、`--json` の実行例がドキュメントから追える。

## 確認事項

- 粒度はこの程度でよいか。
- Issue 2 と Issue 3 は並行可能にしてよいか。
- Issue 7 の実行エラー分類は MVP に含めるか、MVP直後に回すか。
- GitHub issue として公開する場合、この案をこのまま使ってよいか。
