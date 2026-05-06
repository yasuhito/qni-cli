# BasicGates Task 1.8 実装計画

> **エージェント作業者向け:** 必須: この計画を実装するときは、利用できる場合は superpowers:subagent-driven-development を、そうでない場合は superpowers:executing-plans を使う。手順は追跡用にチェックボックス (`- [ ]`) 構文を使う。

**目的:** `BasicGates Task 1.8 BellStateChange1` を `features/katas/basic_gates/bell_state_change_1.feature` に追加し、Quantum Katas の `DumpDiff` と制御付き Bell 状態検証を `qni-cli` 側で再現する。同時に `qni run --symbolic` を 2 量子ビット回路まで拡張する。

**構成方針:** 先に `bell_state_change_1.feature` を追加し、2 量子ビットの数値シナリオ、2 量子ビットの記号表示シナリオ、3 量子ビットの制御付き検証シナリオを書いて失敗 / 成功を確認する。`Task 1.8` の説明力に必要な 2 量子ビットの記号表示は Python/SymPy 補助スクリプトに実装し、Ruby 側は既存の子プロセス境界とエラー整形を再利用する。まずは Bell 系に必要なゲートだけを対象にし、不足が出た場合だけ既存の機能仕様へ最小限の回帰シナリオを追加して実装を足す。

**技術構成:** Ruby, Python, SymPy, Cucumber, Bundler, `qni-cli`

---

## ファイル構成

- 作成: `features/katas/basic_gates/bell_state_change_1.feature`
  - `Task 1.8` の問題文、2 量子ビットの数値シナリオ、2 量子ビットの記号表示シナリオ、3 量子ビットの制御付き検証シナリオを追加する。
- 変更: `features/qni_run.feature`
  - `qni run --symbolic` の 2 量子ビット表示に関する最小限の回帰シナリオを追加する。
- 必要なら変更: `features/qni_expect.feature`
  - 3 量子ビットの制御付き Bell 検証に必要な期待値確認が未保証なら、最小限の回帰シナリオを追加する。
- 変更: `lib/qni/symbolic_state_renderer.rb`
  - 2 量子ビットの記号表示を許可する Ruby 側の分岐と補助スクリプト呼び出しを調整する。
- 変更: `libexec/qni_symbolic_run.py`
  - 2 量子ビットの記号計算と制御付きゲートの適用を実装する。
- 確認: `features/katas/basic_gates/global_phase_change.feature`
  - `Task 1.7` が回帰していないことを確認する。

## タスク 1: `Task 1.8` の機能仕様を先に追加して不足を切り分ける

**ファイル:**
- 作成: `features/katas/basic_gates/bell_state_change_1.feature`
- テスト: `features/katas/basic_gates/bell_state_change_1.feature`

- [ ] **手順 1: `Task 1.8` の問題文とシナリオを書く**

`features/katas/basic_gates/bell_state_change_1.feature` を新規作成し、少なくとも次を追加する。

```gherkin
Feature: Quantum Katas BasicGates Task 1.8 BellStateChange1
  Task 1.8 BellStateChange1: |Φ⁺⟩ を |Φ⁻⟩ に変える
  入力:
  2 量子ビットの Bell 状態 |Φ⁺⟩ = (|00⟩ + |11⟩) / sqrt(2)
  目標:
  状態を |Φ⁻⟩ = (|00⟩ - |11⟩) / sqrt(2) に変える

  Scenario: Task 1.8 は |Φ⁺⟩ を |Φ⁻⟩ に変換する
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add Z --qubit 0 --step 2" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      0.7071067811865475,0.0,0.0,-0.7071067811865475
      """

  Scenario: Task 1.8 は記号表示で |Φ⁻⟩ を示す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add X --control 0 --qubit 1 --step 1" を実行
    And "qni add Z --qubit 0 --step 2" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      <実際の記号表示出力>
      """

  Scenario: Task 1.8 の制御付き検証回路は |000⟩ に戻る
    Given 空の 3 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add H --control 0 --qubit 1 --step 1" を実行
    And "qni add X --control 1 --qubit 2 --step 2" を実行
    And "qni add Z --control 0 --qubit 1 --step 3" を実行
    And "qni add Z --control 0 --qubit 1 --step 4" を実行
    And "qni add X --control 1 --qubit 2 --step 5" を実行
    And "qni add H --control 0 --qubit 1 --step 6" を実行
    And "qni add H --qubit 0 --step 7" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      1.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0
      """
```

記号表示の期待値は、実出力を確認してから固定する。

- [ ] **手順 2: 対象を絞った実行で失敗 / 成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/bell_state_change_1.feature
```

期待結果:

- 少なくとも記号表示 / 制御付き検証のどこで不足があるかを 1 箇所に切り分けられる
- 既存機能で足りる部分はそのまま成功する

- [ ] **手順 3: 機能仕様優先の追加をコミットする**

```bash
git add features/katas/basic_gates/bell_state_change_1.feature
git commit -m "test: add Task 1.8 kata scenarios"
```

## タスク 2: 2 量子ビットの記号表示に関する最小限の回帰シナリオを追加して成功させる

**ファイル:**
- 変更: `features/qni_run.feature`
- 変更: `lib/qni/symbolic_state_renderer.rb`
- 変更: `libexec/qni_symbolic_run.py`
- 必要なら変更: `features/qni_expect.feature`

- [ ] **手順 1: 失敗原因を 1 箇所に絞る**

想定する失敗原因は次に限る。

- `qni run --symbolic` が 2 量子ビット回路を拒否する
- 2 量子ビットで `H`, `Z`, 制御付き `X` の記号適用が足りない
- 3 量子ビットの制御付き検証が既存 `qni run` / `qni expect` で書けない

- [ ] **手順 2: 既存の機能仕様に 2 量子ビット記号表示の最小限の回帰シナリオを追加する**

`features/qni_run.feature` に、Bell 状態の記号表示を確認する最小シナリオを追加する。

- [ ] **手順 3: Python 補助スクリプトと Ruby 境界を最小拡張する**

2 量子ビット限定で `qni run --symbolic` を拡張する。

- Python 補助スクリプトは長さ 4 の状態ベクトルとゲート適用を実装する
- 最低限 `H`, `Z`, 制御付き `X`, 制御付き `Z` を扱う
- Ruby 側は 2 量子ビット回路を許可し、補助スクリプトのエラーを既存の `Simulator::Error` に変換する

- [ ] **手順 4: `Task 1.8` の機能仕様を再実行して成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/bell_state_change_1.feature
```

期待結果:

- `Task 1.8` の機能仕様が成功する

- [ ] **手順 5: 必要な修正をコミットする**

```bash
git add features/katas/basic_gates/bell_state_change_1.feature features/qni_run.feature features/qni_expect.feature lib/qni/symbolic_state_renderer.rb libexec/qni_symbolic_run.py
git commit -m "feat: support Task 1.8 bell state verification"
```

実際に触ったファイルのみ `git add` する。

## タスク 3: 近接回帰を確認する

**ファイル:**
- テスト: `features/qni_run.feature`
- テスト: `features/qni_expect.feature`
- テスト: `features/katas/basic_gates/global_phase_change.feature`
- テスト: `features/katas/basic_gates/bell_state_change_1.feature`

- [ ] **手順 1: 近接する機能仕様をまとめて実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/qni_run.feature \
  features/qni_expect.feature \
  features/katas/basic_gates/global_phase_change.feature \
  features/katas/basic_gates/bell_state_change_1.feature
```

期待結果:

- すべて成功する

- [ ] **手順 2: 近接回帰の成功をコミットする**

```bash
git commit --allow-empty -m "test: verify Task 1.8 regressions"
```

## タスク 4: 全量確認して統合準備をする

**ファイル:**
- テスト: リポジトリ全体の確認

- [ ] **手順 1: 全 Cucumber を実行する**

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
