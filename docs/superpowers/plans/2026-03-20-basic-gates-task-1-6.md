# BasicGates Task 1.6 実装計画

> **自律実行ワーカー向け:** 必須: この計画を実装するときは、利用可能なら superpowers:subagent-driven-development を使い、利用できない場合は superpowers:executing-plans を使う。手順は追跡用にチェックボックス (`- [ ]`) 記法を使う。

**目標:** `BasicGates Task 1.6 PhaseChange` を `features/katas/basic_gates/phase_change.feature` に追加し、Quantum Katas の `DumpDiffOnOneQubit` と `alpha = 0..36` の制御付き等価性検証を `qni-cli` 側で再現する。

**構成方針:** 先に `phase_change.feature` を追加し、既存の `P`、角度式、`qni run`、`qni run --symbolic`、`qni expect`、制御指定だけでタスクを表現できるかを確認する。`Task 1.6` は自己随伴ではないため、制御付き検証では候補の `controlled-P(alpha)` と逆操作の `controlled-P(-alpha)` を組にして制御量子ビットが `|0⟩` に戻ることを見る。不足が出た場合のみ、機能仕様優先で最小の実装修正を追加する。

**技術構成:** Ruby, Cucumber, Bundler, `qni-cli`

---

## ファイル構成

- 作成: `features/katas/basic_gates/phase_change.feature`
  - `Task 1.6` の問題文、`dumpAlpha = 5π/9` の人間向けシナリオ、`alpha = 0..36` の制御付き走査、記号表示の補助シナリオを追加する。
- 必要なら変更: `features/cli/add/add_phase_gate.feature.md`
  - 制御付き `P` を回路に保存できることが未保証なら最小回帰を追加する。
- 必要なら変更: `features/qni_run.feature`
  - `P(alpha)` の記号表示や複素数出力が未保証なら最小回帰を追加する。
- 必要なら変更: `features/qni_expect.feature`
  - 制御付き `P(alpha)` / `P(-alpha)` を含む回路で `ZI` が 1 に戻ることが未保証なら最小回帰を追加する。
- 必要なら変更: `lib/qni/...`
  - 制御付き `P` か記号表示に本当の不足がある場合だけ最小実装を入れる。
- 検証: `features/katas/basic_gates/amplitude_change.feature`
  - `Task 1.4` が回帰していないことを確認する。
- 検証: `features/katas/basic_gates/phase_flip.feature`
  - `Task 1.5` が回帰していないことを確認する。

## タスク 1: `Task 1.6` の機能仕様を先に追加して既存機能で足りるか確認する

**ファイル:**
- 作成: `features/katas/basic_gates/phase_change.feature`
- テスト: `features/katas/basic_gates/phase_change.feature`

- [ ] **手順 1: `Task 1.6` の問題文とシナリオを書く**

`features/katas/basic_gates/phase_change.feature` を新規作成し、少なくとも次を追加する。

```gherkin
Feature: Quantum Katas BasicGates Task 1.6 PhaseChange
  Task 1.6 PhaseChange: |1⟩ 成分に一般角の位相を掛ける
  入力:
  角度 alpha
  1 量子ビットの状態 β|0⟩ + γ|1⟩
  目標:
  |0⟩ はそのままにし、|1⟩ を exp(i*alpha)|1⟩ に変える

  Scenario: Task 1.6 は dumpAlpha = 5π/9 で非自明状態を変換する
    Given 1 qubit の初期状態が "0.6|0> + 0.8|1>" である
    And "qni add P --angle 5π/9 --qubit 0 --step 1" を実行
    When "qni run" を実行
    Then 標準出力:
      """
      <actual dumpAlpha output>
      """

  Scenario Outline: Task 1.6 の制御付き検証回路は alpha を走査して制御量子ビットを |0> に戻す
    Given 空の 2 qubit 回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    And "qni add P --angle alpha --control 0 --qubit 1 --step 2" を実行
    And "qni variable set alpha <alpha>" を実行
    And "qni add P --angle -alpha --control 0 --qubit 1 --step 3" を実行
    And "qni add H --qubit 0 --step 4" を実行
    When "qni expect ZI" を実行
    Then 期待値 "ZI" は 1.0 ± 1e-12

    Examples:
      | alpha  |
      | 0      |
      | π/18   |
      | 2π/18  |
      | 3π/18  |
      | 4π/18  |
      | 5π/18  |
      | 6π/18  |
      | 7π/18  |
      | 8π/18  |
      | π/2    |
      | 10π/18 |
      | 11π/18 |
      | 12π/18 |
      | 13π/18 |
      | 14π/18 |
      | 15π/18 |
      | 16π/18 |
      | 17π/18 |
      | π      |
      | 19π/18 |
      | 20π/18 |
      | 21π/18 |
      | 22π/18 |
      | 23π/18 |
      | 24π/18 |
      | 25π/18 |
      | 26π/18 |
      | 3π/2   |
      | 28π/18 |
      | 29π/18 |
      | 30π/18 |
      | 31π/18 |
      | 32π/18 |
      | 33π/18 |
      | 34π/18 |
      | 35π/18 |
      | 2π     |

  Scenario: Task 1.6 は記号表示で一般式を示す
    Given "qni add P --angle alpha --qubit 0 --step 0" を実行
    When "qni run --symbolic" を実行
    Then 標準出力:
      """
      <actual symbolic output>
      """
```

- [ ] **手順 2: 対象を絞った実行で失敗 / 成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/phase_change.feature
```

期待:

- 少なくともダンプ / 制御付き / 記号表示のどこで不足があるかを 1 箇所に切り分けられる
- 既存機能で足りるならそのまま成功

- [ ] **手順 3: 機能仕様優先の追加をコミットする**

```bash
git add features/katas/basic_gates/phase_change.feature
git commit -m "test: add Task 1.6 kata scenarios"
```

## タスク 2: 必要なら最小修正で成功させる

**ファイル:**
- 変更: `features/katas/basic_gates/phase_change.feature`
- 必要なら変更: `features/cli/add/add_phase_gate.feature.md`
- 必要なら変更: `features/qni_run.feature`
- 必要なら変更: `features/qni_expect.feature`
- 必要なら変更: `lib/qni/...`

- [ ] **手順 1: 失敗原因を 1 箇所に絞る**

想定する失敗原因は次に限る。

- `qni add P --angle ... --control ...` が受理されない
- `qni add P --angle -alpha --control ...` が受理されない
- `qni run --symbolic` の `P(alpha)` 表示が期待と違う
- `qni expect ZI` の丸め差で厳密比較が落ちる

- [ ] **手順 2: 実装コードに不足がある場合だけ既存機能仕様に最小回帰を追加する**

不足が実装コードにある場合のみ、対応する既存機能仕様に最小シナリオを追加する。

例:

- `features/cli/add/add_phase_gate.feature.md`
  - 制御付き `P` が回路に保存できること
- `features/qni_run.feature`
  - `P(alpha)` を未束縛変数付きで記号表示できること
- `features/qni_expect.feature`
  - 制御付き `P(alpha)` と `P(-alpha)` を含む回路で `ZI` が 1 に戻ること

- [ ] **手順 3: 必要な最小実装だけを入れる**

実装変更は、実際に失敗した箇所のみに限定する。

- 制御付き `P` の表現力不足なら、その受理と保存
- 記号表示不足なら、`P(alpha)` の出力整形
- `expect` の丸め差だけなら、既存の近似比較ステップを使う方向を優先する

新しい CLI コマンドや汎用検証機能は追加しない。

- [ ] **手順 4: `Task 1.6` の機能仕様を再実行して成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/phase_change.feature
```

期待:

- `Task 1.6` の機能仕様が成功

- [ ] **手順 5: 必要な修正をコミットする**

```bash
git add features/katas/basic_gates/phase_change.feature features/cli/add/add_phase_gate.feature.md features/qni_run.feature features/qni_expect.feature lib/qni
git commit -m "feat: support Task 1.6 phase change verification"
```

`lib/qni` に変更がない場合は、実際に触ったファイルだけ `git add` する。

## タスク 3: 近接回帰を確認する

**ファイル:**
- テスト: `features/cli/add/add_phase_gate.feature.md`
- テスト: `features/qni_run.feature`
- テスト: `features/qni_expect.feature`
- テスト: `features/katas/basic_gates/amplitude_change.feature`
- テスト: `features/katas/basic_gates/phase_flip.feature`
- テスト: `features/katas/basic_gates/phase_change.feature`

- [ ] **手順 1: 近接機能仕様をまとめて実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/cli/add/add_phase_gate.feature.md \
  features/qni_run.feature \
  features/qni_expect.feature \
  features/katas/basic_gates/amplitude_change.feature \
  features/katas/basic_gates/phase_flip.feature \
  features/katas/basic_gates/phase_change.feature
```

期待:

- すべて成功

- [ ] **手順 2: 近接回帰の成功をコミットする**

```bash
git commit --allow-empty -m "test: verify Task 1.6 regressions"
```

## タスク 4: 全量確認して統合準備をする

**ファイル:**
- テスト: リポジトリ全体のチェック

- [ ] **手順 1: Cucumber 全体を実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber
```

期待:

- 全シナリオが成功

- [ ] **手順 2: Ruby 品質チェックを実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake rubocop
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake reek
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flog
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec rake flay
```

期待:

- すべて成功

- [ ] **手順 3: 統合前の状態を確認する**

実行:

```bash
git status --short
git log --oneline --decorate -5
```

期待:

- 作業ツリーがクリーン
- `Task 1.6` 関連コミットが確認できる
