# BasicGates フィーチャーファイル分割実装計画

> **エージェント作業者向け:** 必須: この計画を実装するときは、superpowers:subagent-driven-development (サブエージェントが利用可能な場合) または superpowers:executing-plans を使う。手順の追跡にはチェックボックス (`- [ ]`) 形式を使う。

**目的:** `features/katas/basic_gates.feature` をタスク名ごとのフィーチャーファイルに分割し、`Task 1.1 StateFlip` と `Task 1.2 BasisChange` を独立して読める回帰テスト構成にする。

**構成方針:** 既存の `features/katas/basic_gates.feature` に入っている `Task 1.1` と `Task 1.2` のシナリオ群を、そのまま `features/katas/basic_gates/state_flip.feature` と `features/katas/basic_gates/basis_change.feature` に移す。製品コードやステップ定義は変えず、フィーチャーファイル構成と実行コマンドだけを更新する。古いパスを含む過去の計画書は歴史的記録として残し、この分割作業では修正対象にしない。

**技術構成:** Ruby, Cucumber, Bundler, `qni-cli`

---

## ファイル構成

- 作成: `features/katas/basic_gates/state_flip.feature`
  - `Task 1.1 StateFlip` の問題文、数値 3 シナリオ、制御付き検証 1 シナリオ、記号的な説明 1 シナリオを移す。
- 作成: `features/katas/basic_gates/basis_change.feature`
  - `Task 1.2 BasisChange` の問題文、数値 2 シナリオ、制御付き検証 1 シナリオ、記号的な説明 1 シナリオを移す。
- 削除: `features/katas/basic_gates.feature`
  - 分割後は不要になる集約フィーチャーファイルを削除する。
- 確認: `features/qni_run.feature`
  - `qni run` と `qni run --symbolic` の既存振る舞いが回帰していないことを確認する。
- 確認: `features/qni_expect.feature`
  - 制御付き検証で使う `qni expect` 経路が回帰していないことを確認する。

## タスク 1: 旧フィーチャーファイルをタスク名ごとのフィーチャーファイルに分解する

**ファイル:**
- 作成: `features/katas/basic_gates/state_flip.feature`
- 作成: `features/katas/basic_gates/basis_change.feature`
- 削除: `features/katas/basic_gates.feature`
- テスト: `features/katas/basic_gates/state_flip.feature`
- テスト: `features/katas/basic_gates/basis_change.feature`

- [ ] **手順 1: `Task 1.1` 用フィーチャーファイルを追加する**

`features/katas/basic_gates/state_flip.feature` を新規作成し、`features/katas/basic_gates.feature` にある `Task 1.1` の内容だけを移す。先頭の問題文もシナリオも、そのまま独立して読める形にする。

- [ ] **手順 2: `Task 1.2` 用フィーチャーファイルを追加する**

`features/katas/basic_gates/basis_change.feature` を新規作成し、`features/katas/basic_gates.feature` にある `Task 1.2` の内容だけを移す。`Task 1.2` はコメント行だった問題文を通常のフィーチャーファイル冒頭説明として読みやすく整える。

- [ ] **手順 3: 旧集約フィーチャーファイルを削除する**

`features/katas/basic_gates.feature` を削除し、タスクごとに分かれた構成だけを残す。

- [ ] **手順 4: 分割した 2 つのフィーチャーファイルだけを実行して成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/state_flip.feature features/katas/basic_gates/basis_change.feature
```

期待結果:

- 成功する
- `Task 1.1` の 5 シナリオが成功する
- `Task 1.2` の 4 シナリオが成功する

- [ ] **手順 5: 分割だけを 1 コミットにする**

```bash
git add features/katas/basic_gates/state_flip.feature features/katas/basic_gates/basis_change.feature features/katas/basic_gates.feature
git commit -m "test: split basic gates kata features"
```

## タスク 2: 実際に使う回帰コマンドを新パスへ切り替える

**ファイル:**
- 確認: `features/qni_run.feature`
- 確認: `features/qni_expect.feature`
- 確認: `features/katas/basic_gates/state_flip.feature`
- 確認: `features/katas/basic_gates/basis_change.feature`

- [ ] **手順 1: 近接回帰セットを新しいフィーチャーファイルのパスで実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature features/qni_expect.feature features/katas/basic_gates/state_flip.feature features/katas/basic_gates/basis_change.feature
```

期待結果:

- 成功する
- `qni run`、`qni run --symbolic`、`qni expect` の既存フィーチャーファイルが回帰していない
- 練習問題側は `Task 1.1` と `Task 1.2` を別ファイルで実行しても成功する

- [ ] **手順 2: 変更差分を確認する**

確認:

- 変更が `features/katas/basic_gates/` 配下のフィーチャーファイル分割に限られている
- 製品コードとステップ定義に変更がない

- [ ] **手順 3: 回帰確認のチェックポイントをコミットする**

```bash
git add features/katas/basic_gates/state_flip.feature features/katas/basic_gates/basis_change.feature features/katas/basic_gates.feature
git commit -m "test: verify split basic gates kata features"
```

## タスク 3: 旧パスが実動線に残っていないことを確認する

**ファイル:**
- 確認: `features/katas/basic_gates/state_flip.feature`
- 確認: `features/katas/basic_gates/basis_change.feature`
- 確認: `docs/superpowers/specs/2026-03-19-quantum-katas-design.md`
- 確認: `docs/superpowers/plans/*.md`

- [ ] **手順 1: `basic_gates.feature` の参照を検索する**

実行:

```bash
rg -n "features/katas/basic_gates\\.feature|basic_gates\\.feature" .
```

期待結果:

- ヒットは過去の仕様書 / 計画書に限られる
- 現行のフィーチャーファイル実行対象や製品コードに旧パスが残っていない

- [ ] **手順 2: 歴史的文書は今回は触らないことを確認する**

この作業では、過去の計画書や仕様書の本文に残る旧パスを一括修正しない。必要になったときに別作業で直す。

- [ ] **手順 3: 最終確認後にコミットする**

```bash
git status --short
```

期待結果:

- 追加の未整理変更がない

## メモ

- この作業の目的はフィーチャーファイルの可読性と運用性の改善であり、`qni-cli` 本体の機能追加ではない。
- `Task 1.3` 以降は最初から `features/katas/basic_gates/<task_name>.feature` 形式で追加する。
- `Task 1.1` と `Task 1.2` のシナリオ本文は、意味を変えずにファイルを分けることを優先する。
