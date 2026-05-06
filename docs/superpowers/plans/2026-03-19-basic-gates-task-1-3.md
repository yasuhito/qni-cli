# BasicGates Task 1.3 実装計画

> **エージェント作業者向け:** 必須: この計画を実装するときは、利用できる場合は superpowers:subagent-driven-development を、利用できない場合は superpowers:executing-plans を使う。手順の追跡にはチェックボックス (`- [ ]`) 記法を使う。

**目的:** `BasicGates Task 1.3 SignFlip` を `features/katas/basic_gates/sign_flip.feature` に追加し、`Z` による符号反転を数値、制御付き検証、記号表示の 3 つの観点で回帰テスト化する。

**構成方針:** `Task 1.1` と `Task 1.2` と同じ粒度を維持するため、新しい `features/katas/basic_gates/sign_flip.feature` を作って `Task 1.3` の 5 シナリオを順に追加する。既存の `qni run`、`qni run --symbolic`、`qni expect`、初期状態ステップだけで表現できる前提で進め、製品コードは触らない。不足が見つかった場合はその場で実装を足さず、新しい仕様書 / 計画書に戻る。

**利用技術:** Ruby, Cucumber, Bundler, `qni-cli`

---

## ファイル構成

- 作成: `features/katas/basic_gates/sign_flip.feature`
  - `Task 1.3` の問題文、数値 3 シナリオ、制御付き検証 1 シナリオ、記号表示 1 シナリオを追加する。
- 確認: `features/katas/basic_gates/state_flip.feature`
  - `Task 1.1` の既存ケースが回帰していないことを確認する。
- 確認: `features/katas/basic_gates/basis_change.feature`
  - `Task 1.2` の既存ケースが回帰していないことを確認する。
- 確認: `features/qni_run.feature`
  - `qni run` と `qni run --symbolic` の既存振る舞いが回帰していないことを確認する。
- 確認: `features/qni_expect.feature`
  - 制御付き `Z` を含む `qni expect` の経路が問題なく動くことを確認する。

## 作業 1: 失敗する `Task 1.3` 機能ファイルを先に追加する

**ファイル:**
- 作成: `features/katas/basic_gates/sign_flip.feature`
- テスト: `features/katas/basic_gates/sign_flip.feature`

- [ ] **手順 1: `Task 1.3` の問題文と 5 シナリオを書く**

`features/katas/basic_gates/sign_flip.feature` を新規作成し、`Task 1.3 SignFlip` の問題文と次の 5 シナリオを追加する。

```gherkin
# language: ja
機能: Quantum Katas BasicGates Task 1.3 SignFlip
  Task 1.3 SignFlip: |+⟩ を |-⟩ に、|-⟩ を |+⟩ に変える

  入力:
  1 量子ビットの状態 |ψ⟩ = α|0⟩ + β|1⟩

  目標:
  状態を α|0⟩ - β|1⟩ に変える

  シナリオ: Task 1.3 は |+> を |-> に変える
    前提 空の 1 qubit 回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    かつ "qni add Z --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865475,-0.7071067811865475
      """

  シナリオ: Task 1.3 は |-> を |+> に変える
    前提 1 qubit の初期状態が "|1>" である
    かつ "qni add H --qubit 0 --step 1" を実行
    かつ "qni add Z --qubit 0 --step 2" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.7071067811865475,0.7071067811865475
      """

  シナリオ: Task 1.3 は 0.6|0> + 0.8|1> を 0.6|0> - 0.8|1> に変える
    前提 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    かつ "qni add Z --qubit 0 --step 1" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      0.6,-0.8
      """

  シナリオ: Task 1.3 の controlled 検証回路は control qubit を |0> に戻す
    前提 空の 2 qubit 回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    かつ "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    かつ "qni add Z --control 0 --qubit 1 --step 2" を実行
    かつ "qni add Z --control 0 --qubit 1 --step 3" を実行
    かつ "qni add H --qubit 0 --step 4" を実行
    もし "qni expect ZI" を実行
    ならば 標準出力:
      """
      ZI=1.0
      """

  シナリオ: Task 1.3 は symbolic 表示で一般状態の符号反転を示す
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    かつ "qni add Z --qubit 0 --step 1" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      cos(theta/2)|0> - sin(theta/2)|1>
      """
```

- [ ] **手順 2: `Task 1.3` 機能ファイルを実行して失敗を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/sign_flip.feature
```

期待結果:

- 新規 `Task 1.3` シナリオのうち少なくとも 1 本が失敗する
- 失敗は期待する標準出力との差、または制御付き `Z` / 記号表示の既存 CLI 表現差にある

- [ ] **手順 3: 失敗する機能ファイルをコミットする**

```bash
git add features/katas/basic_gates/sign_flip.feature
git commit -m "test: add Task 1.3 kata scenarios"
```

## 作業 2: 期待値だけを最小修正して成功させる

**ファイル:**
- 修正: `features/katas/basic_gates/sign_flip.feature`
- テスト: `features/katas/basic_gates/sign_flip.feature`

- [ ] **手順 1: 失敗した 1 シナリオを単独で再実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/sign_flip.feature:1
```

期待結果:

- 実際の `qni run` / `qni run --symbolic` / `qni expect` 出力を確認できる

- [ ] **手順 2: 機能ファイルの期待値だけを最小修正する**

変更は次に限定する。

- 数値の丸め差があれば期待する標準出力を現実の CLI 出力に合わせる
- 記号表示の符号、項順、係数表記が既存 `qni_run.feature` と整合しているなら、その表記に機能ファイルを合わせる
- 制御付き `Z` が既存 CLI で書けない場合はここで止め、新しい仕様書 / 計画書に戻る

このタスクでは製品コードを変更しない。

- [ ] **手順 3: `Task 1.3` 機能ファイルを再実行して成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/sign_flip.feature
```

期待結果:

- `Task 1.3` の 5 シナリオが成功する

- [ ] **手順 4: 修正済み機能ファイルをコミットする**

```bash
git add features/katas/basic_gates/sign_flip.feature
git commit -m "test: document Task 1.3 sign flip"
```

## 作業 3: 近接回帰を確認する

**ファイル:**
- 確認: `features/katas/basic_gates/sign_flip.feature`
- 確認: `features/katas/basic_gates/state_flip.feature`
- 確認: `features/katas/basic_gates/basis_change.feature`
- 確認: `features/qni_run.feature`
- 確認: `features/qni_expect.feature`

- [ ] **手順 1: 近接回帰セットを実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature features/qni_expect.feature features/katas/basic_gates/state_flip.feature features/katas/basic_gates/basis_change.feature features/katas/basic_gates/sign_flip.feature
```

期待結果:

- 成功
- `Task 1.1`、`Task 1.2`、`Task 1.3` が共存して成功する
- `qni run`、`qni run --symbolic`、`qni expect` の既存機能ファイルが回帰していない

- [ ] **手順 2: 最終差分を確認する**

確認項目:

- 変更が `features/katas/basic_gates/sign_flip.feature` だけに収まっている
- 製品コードとステップ定義に変更がない

- [ ] **手順 3: 回帰確認の結果を記録する**

追加差分がない場合はコミットせず、作業メモまたは PR の検証欄に近接回帰セットの成功結果を記録する。

## 補足

- 今回は `Task 1.3` を `Task 1.1` と `Task 1.2` と同じ深さに揃えることが目的であり、製品コード追加は前提にしない。
- `Task 1.3` は位相と符号を扱うため、記号表示の整形を改善したくなる可能性はあるが、この計画ではまず既存出力に機能ファイルを合わせる。
- 制御付き `Z` が `qni add Z --control 0 --qubit 1` でそのまま書けることが前提であり、ここで不足が見つかった場合は新しい仕様書 / 計画書に切り出す。
