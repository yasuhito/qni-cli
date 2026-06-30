# 評価ランナー深掘り issue 分割案

Parent PRD: #286 https://github.com/yasuhito/qni-cli/issues/286

## 1. 評価ランナーの公開入口を定義する

**Blocked by**: None

**User stories covered**: 1, 2, 3, 4, 5, 6, 13, 14, 17

`benchmark` command と `research record` が使う採点入口を、評価ランナー module の公開 interface として定義する。最初の slice では、既存の外部挙動を変えずに、単一課題採点とスイート採点の入口を明確にする。既存の採点結果 shape、終了コード、JSON 出力は維持する。

Acceptance criteria:

- [ ] 評価ランナー module から単一課題採点とスイート採点の公開入口を利用できる。
- [ ] `qni benchmark run` と `qni benchmark run-all` の人間向け出力、JSON 出力、終了コードが変わらない。
- [ ] `qni research record` は CLI 標準出力の再解析ではなく、評価ランナー module の採点入口を使う。
- [ ] 公開入口を直接確認する TypeScript テストがある。
- [ ] `npm run check` が成功する。

## 2. ベンチマーク課題読み込みを評価ランナー内部に閉じ込める

**Blocked by**: issue 1

**User stories covered**: 2, 3, 4, 8, 13, 14, 15

ベンチマーク課題の Markdown 読み込みと YAML frontmatter 検証を、評価ランナー module の内部責務として整理する。CLI command や研究ログ側が課題ファイルの構造を直接意識しない形に近づける。外部挙動は変えない。

Acceptance criteria:

- [ ] 課題読み込みと frontmatter 検証の責務が評価ランナー側にまとまっている。
- [ ] 不正な frontmatter、欠けた必須項目、既存のエラーメッセージと終了コードが維持される。
- [ ] `qni benchmark run` と `qni benchmark run-all --json` の既存テストが通る。
- [ ] `qni research record` の合格・不成功経路が変わらない。
- [ ] `npm run check` が成功する。

## 3. `.qni` 提出物解析と許可コマンド判定を評価ランナー内部に閉じ込める

**Blocked by**: issue 1

**User stories covered**: 2, 3, 5, 9, 13, 14, 15

`.qni` 提出物の読み込み、1行1コマンドの解析、提出物が `qni` で始まることの確認、許可コマンド判定を評価ランナー側にまとめる。提出物形式の知識を CLI 出力や研究ログ保存から切り離す。外部挙動は変えない。

Acceptance criteria:

- [ ] 提出物解析と許可コマンド判定の責務が評価ランナー側にまとまっている。
- [ ] 不許可提出物は従来どおり `disallowed` になり、終了コード `2` を返す。
- [ ] 提出物構文エラーや `qni` で始まらない行のエラー挙動が維持される。
- [ ] `qni research record` は不許可研究試行を従来どおり保存する。
- [ ] `npm run check` が成功する。

## 4. 検証条件の評価とスイート集計を評価ランナー module に移す

**Blocked by**: issues 1, 2, 3

**User stories covered**: 1, 3, 6, 10, 11, 14, 15, 18, 19

`run` 検証条件、`expect` 検証条件、採点状態の決定、スイート内訳の集計を評価ランナー module の中心責務にする。`benchmark` command と `research record` が同じ採点結果を受け取る状態を明確にする。外部挙動は変えない。

Acceptance criteria:

- [ ] 単一課題とスイートの採点結果が評価ランナー module から得られる。
- [ ] `passed`、`failed`、`disallowed`、`error` の分類と終了コードが維持される。
- [ ] `run` 検証条件と `expect` 検証条件の既存テストが通る。
- [ ] `qni benchmark run-all --json` と `qni research record` の結果が同じ採点意味を保つ。
- [ ] `npm run check` が成功する。

## 5. benchmark command を薄い CLI adapter にする

**Blocked by**: issue 4

**User stories covered**: 1, 12, 14, 15, 16, 20

`benchmark` command を、引数解析、評価ランナー呼び出し、JSON または人間向け出力の選択に集中させる。採点の意味は評価ランナー module に閉じ込め、CLI adapter は表示責務に寄せる。外部挙動は変えない。

Acceptance criteria:

- [ ] `benchmark` command は採点処理の細部ではなく評価ランナー module の公開入口を呼ぶ。
- [ ] human output と JSON output は従来と一致する。
- [ ] `benchmark` command のテストはユーザー可視の出力と終了コードを守っている。
- [ ] 研究ログ `result.json` の意味は変わらない。
- [ ] `npm run check` が成功する。
