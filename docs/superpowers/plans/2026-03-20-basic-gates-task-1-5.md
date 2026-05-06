# BasicGates Task 1.5 実装計画

> **自律実装エージェント向け:** 必須: この計画を実装するときは、利用可能なら superpowers:subagent-driven-development、なければ superpowers:executing-plans を使う。進捗管理にはチェックボックス (`- [ ]`) 記法を使う。

**目的:** `BasicGates Task 1.5 PhaseFlip` を `features/katas/basic_gates/phase_flip.feature` に追加し、Quantum Katas の `DumpDiffOnOneQubit` と制御付き等価性検証の意図を `qni-cli` 側で再現する。

**方針:** 先に `phase_flip.feature` を追加して、既存の `S`、`S†`、制御付き指定、`qni run`、`qni run --symbolic`、`qni expect` だけでタスクを表現できるかを確認する。`Task 1.5` は自己随伴ではないため、制御付き検証では候補の制御付き `S` と逆操作の制御付き `S†` を組にして、制御量子ビットが `|0⟩` に戻ることを見る。不足が出た場合のみ、機能仕様を先に定義する方針で新しい仕様書 / 計画書に戻る。

**技術構成:** Ruby, Cucumber, Bundler, `qni-cli`

---

## ファイル構成

- 作成: `features/katas/basic_gates/phase_flip.feature`
  - `Task 1.5` の問題文、`DumpDiffOnOneQubit` 相当の数値シナリオ、制御付き等価性検証、記号表示の補助シナリオを追加する。
- 確認: `features/add_s_gate.feature`
  - `qni add S` の既存挙動が回帰していないことを確認する。
- 確認: `features/add_s_dagger_gate.feature`
  - 制御付き検証で使う `S†` の既存挙動が回帰していないことを確認する。
- 確認: `features/qni_run.feature`
  - 数値実行と記号表示の実行が回帰していないことを確認する。
- 確認: `features/qni_expect.feature`
  - `qni expect` の出力が制御付き検証で回帰していないことを確認する。
- 確認: `features/katas/basic_gates/state_flip.feature`
  - `Task 1.1` が回帰していないことを確認する。
- 確認: `features/katas/basic_gates/basis_change.feature`
  - `Task 1.2` が回帰していないことを確認する。
- 確認: `features/katas/basic_gates/sign_flip.feature`
  - `Task 1.3` が回帰していないことを確認する。
- 確認: `features/katas/basic_gates/amplitude_change.feature`
  - `Task 1.4` が回帰していないことを確認する。

## タスク 1: `Task 1.5` の機能仕様を先に追加して既存機能で足りるか確認する

**対象ファイル:**
- 作成: `features/katas/basic_gates/phase_flip.feature`
- テスト: `features/katas/basic_gates/phase_flip.feature`

- [ ] **手順 1: `Task 1.5` の問題文とシナリオを書く**

`features/katas/basic_gates/phase_flip.feature` を新規作成し、少なくとも次を追加する。

```gherkin
Feature: Quantum Katas BasicGates Task 1.5 PhaseFlip
  Task 1.5 PhaseFlip: |1⟩ 成分にだけ位相 i を掛ける
  入力:
  1 量子ビットの状態 |ψ⟩ = α|0⟩ + β|1⟩
  目標:
  状態を α|0⟩ + iβ|1⟩ に変える

  Scenario: Task 1.5 は 0.6|0> + 0.8|1> の |1> 成分に i を掛ける
    Given 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    And "qni add S --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.6,0.8i
      """

  Scenario: Task 1.5 の制御付き検証回路は制御量子ビットを |0> に戻す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    And "qni add S --control 0 --qubit 1 --step 2" を実行
    And "qni add Sdg --control 0 --qubit 1 --step 3" を実行
    And "qni add H --qubit 0 --step 4" を実行
    When "qni expect ZI" を実行
    Then 標準出力:
      """
      ZI=1.0
      """

  Scenario: Task 1.5 は記号表示で位相 i を示す
    Given 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    And "qni add S --qubit 0 --step 1" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      0.6|0> + 0.8*I|1>
      """
```

- [ ] **手順 2: 対象を絞った実行で失敗 / 成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/phase_flip.feature
```

期待結果:

- 既存機能で足りるならそのまま PASS
- 失敗した場合は、何が不足かを `S` / `Sdg` / 制御付き指定 / 記号表示のどこかに切り分けられる

- [ ] **手順 3: 失敗でも成功でも、機能仕様を先に追加する変更をコミットする**

```bash
git add features/katas/basic_gates/phase_flip.feature
git commit -m "test: add Task 1.5 kata scenarios"
```

## タスク 2: 必要なら最小修正で成功させる

**対象ファイル:**
- 変更: `features/katas/basic_gates/phase_flip.feature`
- 必要なら変更: `features/add_s_gate.feature`
- 必要なら変更: `features/add_s_dagger_gate.feature`
- 必要なら変更: `features/qni_run.feature`
- 必要なら変更: `features/qni_expect.feature`
- 必要なら変更: `lib/qni/...`

- [ ] **手順 1: 失敗原因を 1 箇所に絞る**

想定する失敗原因は次に限る。

- `qni add S --control ...` が受理されない
- `qni add Sdg --control ...` が受理されない
- `qni run --symbolic` の複素係数表記が期待値と違う
- `qni expect ZI` の丸め差で完全一致比較が落ちる

ここで複数の原因が見えた場合でも、最初に 1 つだけ直す。

- [ ] **手順 2: 実装コードの不足がある場合は、既存の機能仕様に最小回帰を追加する**

不足が実装コードにある場合だけ、対応する既存の機能仕様に最小シナリオを追加する。

例:

- `features/add_s_gate.feature`
  - 制御付き `S` が回路に保存できること
- `features/add_s_dagger_gate.feature`
  - 制御付き `Sdg` が回路に保存できること
- `features/qni_run.feature`
  - `S` 適用後に複素係数を数値 / 記号表示の両方で表示できること
- `features/qni_expect.feature`
  - 制御付き `S` と `Sdg` を含む回路で `ZI` が 1 に戻ること

- [ ] **手順 3: 必要な最小実装だけを入れる**

実装変更は、実際に失敗した箇所のみに限定する。

- ゲート登録の不足なら、そのゲートと制御付き指定の受理
- 記号表示の不足なら、複素係数の表記整形
- `qni expect` の丸め差だけなら、既存の近似比較ステップを使う方向を優先する

新しい CLI コマンドや汎用検証機能は追加しない。

- [ ] **手順 4: `Task 1.5` の機能仕様を再実行して成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/phase_flip.feature
```

期待結果:

- `Task 1.5` の 3 シナリオが PASS

- [ ] **手順 5: 必要な修正をコミットする**

```bash
git add features/katas/basic_gates/phase_flip.feature features/add_s_gate.feature features/add_s_dagger_gate.feature features/qni_run.feature features/qni_expect.feature lib/qni
git commit -m "feat: support Task 1.5 phase flip verification"
```

`lib/qni` に変更がない場合は、実際に触ったファイルだけ `git add` する。

## タスク 3: 近接回帰を確認する

**対象ファイル:**
- テスト: `features/add_s_gate.feature`
- テスト: `features/add_s_dagger_gate.feature`
- テスト: `features/qni_run.feature`
- テスト: `features/qni_expect.feature`
- テスト: `features/katas/basic_gates/state_flip.feature`
- テスト: `features/katas/basic_gates/basis_change.feature`
- テスト: `features/katas/basic_gates/sign_flip.feature`
- テスト: `features/katas/basic_gates/amplitude_change.feature`
- テスト: `features/katas/basic_gates/phase_flip.feature`

- [ ] **手順 1: 近接する機能仕様をまとめて実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/add_s_gate.feature \
  features/add_s_dagger_gate.feature \
  features/qni_run.feature \
  features/qni_expect.feature \
  features/katas/basic_gates/state_flip.feature \
  features/katas/basic_gates/basis_change.feature \
  features/katas/basic_gates/sign_flip.feature \
  features/katas/basic_gates/amplitude_change.feature \
  features/katas/basic_gates/phase_flip.feature
```

期待結果:

- すべて PASS

- [ ] **手順 2: 近接回帰の成功をコミットする**

```bash
git commit --allow-empty -m "test: verify Task 1.5 regressions"
```

## タスク 4: 全量確認して統合準備をする

**対象ファイル:**
- テスト: リポジトリ全体の確認

- [ ] **手順 1: Cucumber 全体を実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber
```

期待結果:

- 全シナリオが PASS

- [ ] **手順 2: Ruby 品質チェックを実行する**

実行:

```bash
rake rubocop
rake reek
rake flog
rake flay
```

期待結果:

- すべて PASS

- [ ] **手順 3: 統合前の状態を確認する**

実行:

```bash
git status --short
git log --oneline --decorate -5
```

期待結果:

- 作業ツリーがクリーン
- `Task 1.5` 関連コミットが確認できる
