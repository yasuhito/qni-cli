# BasicGates Task 1.7 実装計画

> **エージェント作業者向け:** 必須: この計画を実装するときは、利用できる場合は `superpowers:subagent-driven-development`、利用できない場合は `superpowers:executing-plans` を使う。手順は進捗管理のためチェックボックス（`- [ ]`）構文を使う。

**目的:** `BasicGates Task 1.7 GlobalPhaseChange` を `features/katas/basic_gates/global_phase_change.feature` に追加し、Quantum Katas の制御付き等価性検証を `qni-cli` 側で再現する。

**設計:** 先に `global_phase_change.feature` を追加し、既存の `Rz`、角度式、`qni run --symbolic`、`qni expect`、`--control` 指定だけで `Task 1.7` を表現できるかを確認する。`Task 1.7` は単独の 1 量子ビットでは観測できないグローバル位相を扱うため、機能ファイルの中心は制御付き検証とし、記号計算出力は補助説明として追加する。必要なら実際の `qni run --symbolic` 出力を見てから期待値を固定する。

**技術構成:** Ruby, Cucumber, Bundler, `qni-cli`

---

## ファイル構成

- 作成: `features/katas/basic_gates/global_phase_change.feature`
  - `Task 1.7` の問題文、制御付き検証シナリオ、記号計算の補助シナリオを追加する。
- 必要なら変更: `features/qni_run.feature`
  - `Rz(2π)` の記号計算出力が未保証なら最小回帰を追加する。
- 必要なら変更: `features/qni_expect.feature`
  - 制御付き `Rz(2π)` / `Rz(-2π)` を含む回路で `ZI` が 1 に戻ることが未保証なら最小回帰を追加する。
- 必要なら変更: `lib/qni/...`
  - `Rz(2π)` の表現や記号計算出力に本当の不足がある場合だけ最小実装を入れる。
- 確認: `features/katas/basic_gates/phase_change.feature`
  - `Task 1.6` が回帰していないことを確認する。

## 作業 1: `Task 1.7` の機能ファイルを先に追加して既存機能で足りるか確認する

**対象ファイル:**
- 作成: `features/katas/basic_gates/global_phase_change.feature`
- テスト: `features/katas/basic_gates/global_phase_change.feature`

- [ ] **手順 1: `Task 1.7` の問題文とシナリオを書く**

`features/katas/basic_gates/global_phase_change.feature` を新規作成し、少なくとも次を追加する。

```gherkin
Feature: Quantum Katas BasicGates Task 1.7 GlobalPhaseChange
  Task 1.7 GlobalPhaseChange: 状態全体に -1 を掛ける
  入力:
  1 量子ビットの状態 β|0⟩ + γ|1⟩
  目標:
  状態を -β|0⟩ - γ|1⟩ に変える
  注意:
  単独の量子ビットではグローバル位相は観測できないため、制御付き版で確認する

  Scenario: Task 1.7 の制御付き検証回路は制御量子ビットを |0> に戻す
    Given 空の 2 量子ビット回路がある
    And "qni add H --qubit 0 --step 0" を実行
    And "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    And "qni add Rz --angle 2π --control 0 --qubit 1 --step 2" を実行
    And "qni add Rz --angle -2π --control 0 --qubit 1 --step 3" を実行
    And "qni add H --qubit 0 --step 4" を実行
    When "qni expect ZI" を実行
    Then 期待値 "ZI" は 1.0 ± 1e-12
```

記号計算の補助シナリオは、`qni run --symbolic` の実出力を確認してから期待値を固定する。

- [ ] **手順 2: 絞り込み実行で失敗 / 成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/global_phase_change.feature
```

期待結果:

- 少なくとも制御付き検証 / 記号計算出力のどこで不足があるかを 1 箇所に切り分けられる
- 既存機能で足りるならそのまま成功する

- [ ] **手順 3: 機能ファイル先行の追加をコミットする**

```bash
git add features/katas/basic_gates/global_phase_change.feature
git commit -m "test: add Task 1.7 kata scenarios"
```

## 作業 2: 必要なら最小修正で成功させる

**対象ファイル:**
- 変更: `features/katas/basic_gates/global_phase_change.feature`
- 必要なら変更: `features/qni_run.feature`
- 必要なら変更: `features/qni_expect.feature`
- 必要なら変更: `lib/qni/...`

- [ ] **手順 1: 失敗原因を 1 箇所に絞る**

想定する失敗原因は次に限る。

- `qni add Rz --angle 2π --control ...` が受理されない
- `qni add Rz --angle -2π --control ...` が受理されない
- `qni run --symbolic` の `Rz(2π)` 表示が期待値と違う
- `qni expect ZI` の丸め差で厳密比較が落ちる

- [ ] **手順 2: 製品コードに不足がある場合だけ既存の機能ファイルに最小回帰を追加する**

不足が製品コードにある場合のみ、対応する既存の機能ファイルに最小シナリオを追加する。

- [ ] **手順 3: 必要な最小実装だけを入れる**

実装変更は、実際に失敗した箇所のみに限定する。

- [ ] **手順 4: `Task 1.7` の機能ファイルを再実行して成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/global_phase_change.feature
```

期待結果:

- `Task 1.7` の機能ファイルが成功する

- [ ] **手順 5: 必要な修正をコミットする**

```bash
git add features/katas/basic_gates/global_phase_change.feature features/qni_run.feature features/qni_expect.feature lib/qni
git commit -m "feat: support Task 1.7 global phase verification"
```

`lib/qni` に変更がない場合は、実際に触ったファイルだけ `git add` する。

## 作業 3: 近接回帰を確認する

**対象ファイル:**
- テスト: `features/qni_run.feature`
- テスト: `features/qni_expect.feature`
- テスト: `features/katas/basic_gates/phase_change.feature`
- テスト: `features/katas/basic_gates/global_phase_change.feature`

- [ ] **手順 1: 近接する機能ファイルをまとめて実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber \
  features/qni_run.feature \
  features/qni_expect.feature \
  features/katas/basic_gates/phase_change.feature \
  features/katas/basic_gates/global_phase_change.feature
```

期待結果:

- すべて成功する

- [ ] **手順 2: 近接回帰の成功をコミットする**

```bash
git commit --allow-empty -m "test: verify Task 1.7 regressions"
```

## 作業 4: 全量確認して統合準備をする

**対象ファイル:**
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
