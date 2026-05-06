# BasicGates Task 1.10 実装計画

> **自律作業者向け:** 必須: この計画の実装には、利用できる場合は `superpowers:subagent-driven-development`、それ以外は `superpowers:executing-plans` を使う。進捗管理にはチェックボックス記法（`- [ ]`）を使う。

**目的:** `BasicGates Task 1.10 BellStateChange3` を `features/katas/basic_gates/bell_state_change_3.feature` に追加し、Quantum Katas の `DumpDiff` と制御付き Bell 状態検証を `qni-cli` 側で再現する。

**構成:** 先に `bell_state_change_3.feature` を追加し、2 量子ビットの数値シナリオ、2 量子ビットの記号表示シナリオ、3 量子ビットの制御付き検証シナリオを書いて失敗 / 成功を確認する。`Task 1.8` と `Task 1.9` で整えた 2 量子ビットの記号表示対応はそのまま再利用し、今回の焦点は `Task 1.10` 固有の位相罠を避けるために候補を `qs[0]` に固定することと、`VerifyBellStateConversion(..., 0, 3)` の再現に多重制御 `X` が本当に必要かを機能仕様を先に書く方針で切り分けることに置く。

**利用技術:** Ruby, Python, SymPy, Cucumber, Bundler, `qni-cli`

---

## ファイル構成

- 作成: `features/katas/basic_gates/bell_state_change_3.feature`
  - `Task 1.10` の問題文、2 量子ビットの数値シナリオ、2 量子ビットの記号表示シナリオ、3 量子ビットの制御付き検証シナリオを追加する。
- 必要なら変更: `features/qni_run.feature`
  - `Task 1.10` 用の Bell 状態の記号表示が未保証なら最小回帰を追加する。
- 必要なら変更: `features/step_definitions/cli_steps.rb`
  - Bell 系タスクに必要なテスト支援が不足している場合だけ最小追加する。
- 必要なら変更: `lib/qni/...`
  - `Task 1.10` の制御付き検証で多重制御 `X` が不足した場合のみ、既存ゲート実行系に最小追加する。
- 検証: `features/katas/basic_gates/bell_state_change_1.feature`
  - `Task 1.8` が回帰していないことを確認する。
- 検証: `features/katas/basic_gates/bell_state_change_2.feature`
  - `Task 1.9` が回帰していないことを確認する。

## タスク 1: `Task 1.10` の機能仕様を先に追加して不足を切り分ける

**ファイル:**
- 作成: `features/katas/basic_gates/bell_state_change_3.feature`
- テスト: `features/katas/basic_gates/bell_state_change_3.feature`

- [ ] **手順 1: `Task 1.10` の問題文とシナリオを書く**

`features/katas/basic_gates/bell_state_change_3.feature` を新規作成し、少なくとも次を追加する。

```gherkin
Feature: Quantum Katas BasicGates Task 1.10 BellStateChange3
  Task 1.10 BellStateChange3: |Φ⁺⟩ を |Ψ⁻⟩ に変える
  入力:
  2 量子ビットの Bell 状態 |Φ⁺⟩ = (|00⟩ + |11⟩) / sqrt(2)
  目標:
  状態を |Ψ⁻⟩ = (|01⟩ - |10⟩) / sqrt(2) に変える

  Scenario: Task 1.10 は |Φ⁺⟩ を |Ψ⁻⟩ に変換する
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add X --qubit 0 --step 2" を実行
    And "qni add Z --qubit 0 --step 3" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,0.7071067811865475,-0.7071067811865475,0.0
      """

  Scenario: Task 1.10 はシンボリック表示で |Ψ⁻⟩ を示す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add X --qubit 0 --step 2" を実行
    And "qni add Z --qubit 0 --step 3" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      0.707106781186547|01> - 0.707106781186547|10>
      """

  Scenario: Task 1.10 の制御付き検証回路は |000⟩ に戻る
    Given 空の 3 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add H --control 0 --qubit 1 --step 1" を実行
    And "qni add X --control 0,1 --qubit 2 --step 2" を実行
    And "qni add X --control 0 --qubit 1 --step 3" を実行
    And "qni add Z --control 0 --qubit 1 --step 4" を実行
    And "qni add X --control 0 --qubit 2 --step 5" を実行
    And "qni add Z --control 0 --qubit 2 --step 6" を実行
    And "qni add X --control 0,1 --qubit 2 --step 7" を実行
    And "qni add H --control 0 --qubit 1 --step 8" を実行
    And "qni add H --qubit 0 --step 9" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0
      """
```

この時点で機能仕様に書く制御付き検証シナリオ自体は、`VerifyBellStateConversion(..., 0, 3)` の意図した回路を正確に表す。失敗が出る場合は、`CCNOT` 相当の不足や実行系の不足を示すものとして解釈する。

- [ ] **手順 2: 対象を絞った実行で失敗 / 成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/bell_state_change_3.feature
```

期待結果:

- 数値 / 記号表示のどこまで既存機能だけで通るかが分かる
- 制御付き検証で多重制御 `X` 相当が不足しているか、あるいは機能仕様の並びだけで書けるかを切り分けられる

- [ ] **手順 3: 機能仕様を先に追加した内容をコミットする**

```bash
git add features/katas/basic_gates/bell_state_change_3.feature
git commit -m "test: add Task 1.10 kata scenarios"
```

## タスク 2: 必要なら最小修正で成功させる

**ファイル:**
- 変更: `features/katas/basic_gates/bell_state_change_3.feature`
- 必要なら変更: `features/qni_run.feature`
- 必要なら変更: `features/step_definitions/cli_steps.rb`
- 必要なら変更: `lib/qni/...`

- [ ] **手順 1: 失敗原因を 1 箇所に絞る**

想定する失敗原因は次に限る。

- 制御付き検証回路の書き下ろしが間違っている
- `Task 1.10` に必要な多重制御 `X`、すなわち `CCNOT` 相当の表現や実行が不足している
- `Task 1.10` 用の Bell 状態の記号表示が既存の `qni run --symbolic` で未保証である

- [ ] **手順 2: 製品コードに不足がある場合だけ既存の機能仕様に最小回帰を追加する**

不足が製品コードにある場合のみ、対応する既存の機能仕様に最小シナリオを追加する。

- `CCNOT` 相当が不足しているなら、その表現と実行を保証する機能仕様を先に追加する
- 記号表示出力の不足なら `features/qni_run.feature` に最小回帰を追加する

- [ ] **手順 3: 必要な最小実装だけを入れる**

実装変更は、実際に失敗した箇所のみに限定する。

- 多重制御 `X` が必要なら、それを支える最小実装だけを追加する
- `Task 1.10` 自体に不要な一般化はしない

- [ ] **手順 4: `Task 1.10` の機能仕様を再実行して成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/bell_state_change_3.feature
```

期待結果:

- `Task 1.10` の機能仕様が成功する

- [ ] **手順 5: 必要な修正をコミットする**

```bash
git add features/katas/basic_gates/bell_state_change_3.feature features/qni_run.feature features/step_definitions/cli_steps.rb lib/qni
git commit -m "feat: support Task 1.10 bell state verification"
```

実際に触ったファイルのみ `git add` する。

## タスク 3: 近接回帰を確認する

**ファイル:**
- テスト: `features/qni_run.feature`
- テスト: `features/katas/basic_gates/bell_state_change_1.feature`
- テスト: `features/katas/basic_gates/bell_state_change_2.feature`
- テスト: `features/katas/basic_gates/bell_state_change_3.feature`

- [ ] **手順 1: 近接機能仕様をまとめて実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/qni_run.feature \
  features/katas/basic_gates/bell_state_change_1.feature \
  features/katas/basic_gates/bell_state_change_2.feature \
  features/katas/basic_gates/bell_state_change_3.feature
```

期待結果:

- すべて成功する

- [ ] **手順 2: 近接回帰の成功確認をコミットする**

```bash
git commit --allow-empty -m "test: verify Task 1.10 regressions"
```

## タスク 4: 全量確認して統合準備をする

**ファイル:**
- テスト: リポジトリ全体のチェック

- [ ] **手順 1: Cucumber 全体を実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber
```

期待結果:

- 全シナリオが成功する

- [ ] **手順 2: Ruby 品質チェックを実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake rubocop
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake reek
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flog
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flay
```

期待結果:

- すべて成功する
