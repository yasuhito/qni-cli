# BasicGates Task 1.9 実装計画

> **アーカイブ:** この文書は完了済みの過去計画です。現在の実装指示としては使いません。

**目標:** `BasicGates Task 1.9 BellStateChange2` を `features/katas/basic_gates/bell_state_change_2.feature` に追加し、Quantum Katas の `DumpDiff` と制御付き Bell 状態検証を `qni-cli` 側で再現する。

**構成方針:** 先に `bell_state_change_2.feature` を追加し、2 量子ビットの数値シナリオ、2 量子ビットの記号表示シナリオ、3 量子ビットの制御付き検証シナリオを書いて失敗 / 成功を確認する。`Task 1.8` で追加した 2 量子ビットの記号表示と 3 量子ビットの空回路ステップをそのまま再利用し、まずは新機能追加なしで完結するかを確かめる。不足が出た場合のみ、既存の機能仕様へ最小回帰を追加して実装を足す。

**技術スタック:** Ruby, Python, SymPy, Cucumber, Bundler, `qni-cli`

---

## ファイル構成

- 作成: `features/katas/basic_gates/bell_state_change_2.feature`
  - `Task 1.9` の問題文、2 量子ビットの数値シナリオ、2 量子ビットの記号表示シナリオ、3 量子ビットの制御付き検証シナリオを追加する。
- 必要なら変更: `features/qni_run.feature`
  - `Task 1.9` 用の Bell 状態の記号表示が未保証なら最小回帰を追加する。
- 必要なら変更: `features/qni_expect.feature`
  - 3 量子ビットの制御付き Bell 検証に必要な期待値確認が未保証なら最小回帰を追加する。
- 必要なら変更: `features/step_definitions/cli_steps.rb`
  - Bell 系タスクに必要なテスト補助が不足している場合だけ最小追加する。
- 確認: `features/katas/basic_gates/bell_state_change_1.feature`
  - `Task 1.8` が回帰していないことを確認する。
- 確認: `features/katas/basic_gates/global_phase_change.feature`
  - `Task 1.7` が回帰していないことを確認する。

## タスク 1: `Task 1.9` の機能仕様を先に追加して不足を切り分ける

**ファイル:**
- 作成: `features/katas/basic_gates/bell_state_change_2.feature`
- テスト: `features/katas/basic_gates/bell_state_change_2.feature`

- [ ] **ステップ 1: `Task 1.9` の問題文とシナリオを書く**

`features/katas/basic_gates/bell_state_change_2.feature` を新規作成し、少なくとも次を追加する。

```gherkin
Feature: Quantum Katas BasicGates Task 1.9 BellStateChange2
  Task 1.9 BellStateChange2: |Φ⁺⟩ を |Ψ⁺⟩ に変える
  入力:
  2 量子ビットの Bell 状態 |Φ⁺⟩ = (|00⟩ + |11⟩) / sqrt(2)
  目標:
  状態を |Ψ⁺⟩ = (|01⟩ + |10⟩) / sqrt(2) に変える

  Scenario: Task 1.9 は |Φ⁺⟩ を |Ψ⁺⟩ に変換する
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add X --qubit 0 --step 2" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.0,0.7071067811865475,0.7071067811865475,0.0
      """

  Scenario: Task 1.9 は symbolic 表示で |Ψ⁺⟩ を示す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add X --qubit 0 --step 2" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      0.707106781186547|01> + 0.707106781186547|10>
      """

  Scenario: Task 1.9 の controlled 検証回路は |000⟩ に戻る
    Given 空の 3 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add H --control 0 --qubit 1 --step 1" を実行
    And "qni add X --control 1 --qubit 2 --step 2" を実行
    And "qni add X --control 0 --qubit 1 --step 3" を実行
    And "qni add X --control 0 --qubit 1 --step 4" を実行
    And "qni add X --control 1 --qubit 2 --step 5" を実行
    And "qni add H --control 0 --qubit 1 --step 6" を実行
    And "qni add H --qubit 0 --step 7" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0
      """
```

- [ ] **ステップ 2: 対象を絞った実行で失敗 / 成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/bell_state_change_2.feature
```

期待値:

- 少なくとも数値 / 記号表示 / 制御付き検証のどこで不足があるかを 1 箇所に切り分けられる
- `Task 1.8` の基盤だけで足りるならそのまま成功

- [ ] **ステップ 3: 機能仕様優先の追加をコミットする**

```bash
git add features/katas/basic_gates/bell_state_change_2.feature
git commit -m "test: add Task 1.9 kata scenarios"
```

## タスク 2: 必要なら最小修正で成功させる

**ファイル:**
- 変更: `features/katas/basic_gates/bell_state_change_2.feature`
- 必要なら変更: `features/qni_run.feature`
- 必要なら変更: `features/qni_expect.feature`
- 必要なら変更: `features/step_definitions/cli_steps.rb`
- 必要なら変更: `lib/qni/...`

- [ ] **ステップ 1: 失敗原因を 1 箇所に絞る**

想定する失敗原因は次に限る。

- `Task 1.8` で追加した 2 量子ビットの記号表示の対象ゲートが足りない
- 3 量子ビットの制御付き検証の並びが誤っている
- Bell 系タスクに必要なテスト補助が不足している

- [ ] **ステップ 2: 製品コードに不足がある場合だけ既存の機能仕様に最小回帰を追加する**

不足が製品コードにある場合のみ、対応する既存の機能仕様に最小シナリオを追加する。

- [ ] **ステップ 3: 必要な最小実装だけを入れる**

実装変更は、実際に失敗した箇所のみに限定する。

- [ ] **ステップ 4: `Task 1.9` の機能仕様を再実行して成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/bell_state_change_2.feature
```

期待値:

- `Task 1.9` の機能仕様が成功

- [ ] **ステップ 5: 必要な修正をコミットする**

```bash
git add features/katas/basic_gates/bell_state_change_2.feature features/qni_run.feature features/qni_expect.feature features/step_definitions/cli_steps.rb lib/qni
git commit -m "feat: support Task 1.9 bell state verification"
```

実際に触ったファイルのみ `git add` する。

## タスク 3: 近接回帰を確認する

**ファイル:**
- テスト: `features/qni_run.feature`
- テスト: `features/qni_expect.feature`
- テスト: `features/katas/basic_gates/global_phase_change.feature`
- テスト: `features/katas/basic_gates/bell_state_change_1.feature`
- テスト: `features/katas/basic_gates/bell_state_change_2.feature`

- [ ] **ステップ 1: 近接する機能仕様をまとめて実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/qni_run.feature \
  features/qni_expect.feature \
  features/katas/basic_gates/global_phase_change.feature \
  features/katas/basic_gates/bell_state_change_1.feature \
  features/katas/basic_gates/bell_state_change_2.feature
```

期待値:

- すべて成功

- [ ] **ステップ 2: 近接回帰の成功確認をコミットする**

```bash
git commit --allow-empty -m "test: verify Task 1.9 regressions"
```

## タスク 4: 全量確認して統合準備をする

**ファイル:**
- テスト: リポジトリ全体チェック

- [ ] **ステップ 1: Cucumber 全体を実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber
```

期待値:

- 全シナリオが成功

- [ ] **ステップ 2: Ruby 品質チェックを実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake rubocop
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake reek
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flog
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flay
```

期待値:

- すべて成功
