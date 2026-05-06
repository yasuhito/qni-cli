# BasicGates Task 1.2 実装計画

> **エージェント作業者向け:** 必須: この計画の実装には superpowers:subagent-driven-development（サブエージェントが利用できる場合）または superpowers:executing-plans を使う。進捗管理にはチェックボックス（`- [ ]`）形式の手順を使う。

**目的:** `BasicGates Task 1.2 BasisChange` を `features/katas/basic_gates.feature` に追加し、`H` による基底変換を数値、制御付き検証、記号表示の 3 つの観点で回帰テスト化する。

**構成方針:** `Task 1.1` と同じ粒度を維持するため、`features/katas/basic_gates.feature` に `Task 1.2` の 5 シナリオを順に追加する。既存の `qni run`、`qni run --symbolic`、`qni expect`、初期状態のステップだけで表現できる前提で進め、製品コードは触らない。

**技術構成:** Ruby, Cucumber, Bundler, `qni-cli`

---

## ファイル構成

- 変更: `features/katas/basic_gates.feature`
  - `Task 1.2` の数値 2 シナリオ、制御付き検証 1 シナリオ、記号表示の説明 1 シナリオ、問題文ヘッダーを追加する。
- 確認: `features/qni_run.feature`
  - `H` と `qni run --symbolic` の既存振る舞いが回帰していないことを確認する。
- 確認: `features/qni_expect.feature`
  - 制御付き `H` を含む `qni expect` の経路が問題なく動くことを確認する。
- 確認: `features/katas/basic_gates.feature`
  - `Task 1.1` と `Task 1.2` が同じフィーチャーファイル内で共存して成功することを確認する。

## タスク 1: 失敗する Task 1.2 シナリオを先に追加する

**対象ファイル:**
- 変更: `features/katas/basic_gates.feature`
- テスト: `features/katas/basic_gates.feature`

- [ ] **手順 1: 新しい Task 1.2 セクションとシナリオを書く**

`features/katas/basic_gates.feature` に `Task 1.2 BasisChange` の説明行と次の 4 シナリオを追加する。

```gherkin
  シナリオ: Task 1.2 は |0> を |+> に変える
    前提 空の 1 qubit 回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865475,0.7071067811865475
      """

  シナリオ: Task 1.2 は |1> を |-> に変える
    前提 1 qubit の初期状態が "|1>" である
    かつ "qni add H --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865475,-0.7071067811865475
      """

  シナリオ: Task 1.2 の制御付き検証回路は制御量子ビットを |0> に戻す
    前提 空の 2 qubit 回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    かつ "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    かつ "qni add H --control 0 --qubit 1 --step 2" を実行
    かつ "qni add H --control 0 --qubit 1 --step 3" を実行
    かつ "qni add H --qubit 0 --step 4" を実行
    もし "qni expect ZI" を実行
    ならば 標準出力:
      """
      ZI=1.0
      """

  シナリオ: Task 1.2 は記号表示で一般状態への基底変換を示す
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    かつ "qni add H --qubit 0 --step 1" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      0.7071067811865475*cos(theta/2) + 0.7071067811865475*sin(theta/2)|0> + 0.7071067811865475*cos(theta/2) - 0.7071067811865475*sin(theta/2)|1>
      """
```

`Task 1.2` の問題文要約も `Task 1.1` と同じ形式でフィーチャーファイル上に追加する。

- [ ] **手順 2: 対象の kata フィーチャーファイルを実行し、失敗を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

期待結果:

- 新規 `Task 1.2` シナリオのうち少なくとも 1 本が失敗する
- 失敗理由は期待文字列か、制御付き `H` の CLI 表現差にある
- `Task 1.1` シナリオ群は引き続き成功する

- [ ] **手順 3: 失敗するフィーチャーファイルをコミットする**

```bash
git add features/katas/basic_gates.feature
git commit -m "test: add Task 1.2 kata scenarios"
```

## タスク 2: 実際の CLI 出力に合わせてフィーチャーファイルの期待値だけを調整する

**対象ファイル:**
- 変更: `features/katas/basic_gates.feature`
- テスト: `features/katas/basic_gates.feature`

- [ ] **手順 1: 失敗している Task 1.2 シナリオを 1 つ再実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature:60
```

期待結果:

- 実際の `qni run` / `qni run --symbolic` / `qni expect` 出力を 1 シナリオ単位で確認できる

- [ ] **手順 2: フィーチャーファイルに最小限の修正を入れる**

変更は次に限定する。

- 数値の丸め差があれば期待標準出力を実際の CLI 出力に合わせる
- 記号表示の項順や係数表記が既存 `qni_run.feature` と整合しているなら、その表記にフィーチャーファイルを合わせる
- 制御付き `H` が既存 CLI で書けない場合はここで止め、新しい仕様書 / 計画書に戻る

このタスクでは製品コードを変更しない。

- [ ] **手順 3: kata フィーチャーファイルを再実行し、成功に変わることを確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

期待結果:

- `Task 1.1` と `Task 1.2` を含む kata フィーチャーファイルが成功する

- [ ] **手順 4: 修正したフィーチャーファイルをコミットする**

```bash
git add features/katas/basic_gates.feature
git commit -m "test: document Task 1.2 basis change"
```

## タスク 3: 近接する回帰を確認する

**対象ファイル:**
- 確認: `features/katas/basic_gates.feature`
- 確認: `features/qni_run.feature`
- 確認: `features/qni_expect.feature`

- [ ] **手順 1: 対象の回帰確認を実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature features/qni_expect.feature features/katas/basic_gates.feature
```

期待結果:

- 成功
- `Task 1.2` の数値・制御付き・記号表示の 3 系統が成功する
- `Task 1.1` の既存ケースが回帰していない

- [ ] **手順 2: 最終差分を確認する**

確認:

- 変更が `features/katas/basic_gates.feature` だけに収まっている
- 製品コードに変更がない

- [ ] **手順 3: 検証の区切りをコミットする**

```bash
git add features/katas/basic_gates.feature
git commit -m "test: verify Task 1.2 kata coverage"
```

## メモ

- 今回は `Task 1.2` を `Task 1.1` と同じ深さに揃えることが目的であり、製品コード追加は前提にしない。
- 記号表示シナリオの式は、説明の分かりやすさよりも既存 `qni run --symbolic` の実出力との一致を優先する。
- 制御付き `H` が `qni add H --control 0 --qubit 1` でそのまま書けることが前提であり、ここで不足が見つかった場合は新しい仕様書 / 計画書に切り出す。
