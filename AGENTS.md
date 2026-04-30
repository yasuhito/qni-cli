# AGENTS.md

## Feature Development Rule

- `features/*.feature` または `features/*.feature.md` のない機能は存在しないのと同じ。
- 機能を追加するときには、先に `features/*.feature` または `features/*.feature.md` を追加する。

## Cucumber Scenario Rule

- 1つの Cucumber シナリオに `Then` は1つだけ置く。
- `Then` の後に続く検証目的の `And` も `Then` とみなす。
- 2つ以上の検証が必要な場合は、失敗箇所を分かりやすくするため別々のシナリオに分ける。
- `コマンドは成功して標準出力:` や `コマンドは失敗して標準エラー:` のように、複数の検証を1つにまとめた composite assertion step は追加しない。
- 成功/失敗確認と stdout/stderr の確認が両方必要な場合も、検証目的ごとにシナリオを分ける。

## Reek Rule

- `.reek.yml` で警告を安易に無視しない。
- まずコードをリファクタリングして smell を解消する。
- ignore を追加・維持するのは、コード側で直すと責務や可読性がむしろ悪化する場合だけにする。

## qni CLI Growth Rule

- qni CLI にまだ無い機能が必要になったときは、既存機能でごまかす前に機能追加を検討する。
- Quantum Katas など既知のユースケースで自然に必要な機能は、feature-first で qni CLI に追加することを優先する。
- 元の task や回路の意図を崩して回避するのではなく、qni CLI 自体を成長させる方向をまず考える。

## Linear Issue Rule

- Linear に issue を作成するとき、タイトルは日本語にする。

## Verification Rule

- commit や push の前には full check を fresh に通す。
- 少なくとも `bundle exec rake check` を成功させてから commit / push する。
- 部分的なテストや前回の成功結果ではなく、その時点の作業木に対する最新の実行結果を確認する。
