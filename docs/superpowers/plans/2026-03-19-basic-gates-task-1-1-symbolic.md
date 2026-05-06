# BasicGates Task 1.1 記号表示シナリオ実装計画

> **エージェント作業者向け:** 必須: この計画を実装するときは superpowers:subagent-driven-development (サブエージェントが利用可能な場合) または superpowers:executing-plans を使う。手順は進捗管理のためチェックボックス (`- [ ]`) 記法を使う。

**目的:** `BasicGates Task 1.1 StateFlip` に `qni run --symbolic` を使った説明用シナリオを 1 本追加し、一般式 `α|0> + β|1> -> α|1> + β|0>` を Kata の機能ファイル上で直接読めるようにする。

**構成方針:** 既存の数値シナリオと制御ゲート検証シナリオは残し、`features/katas/basic_gates.feature` にだけ記号表示の回帰ケースを追加する。製品コードはすでに `qni run --symbolic` を持っているため、今回は機能ファイルの追加だけで閉じる前提で進め、回帰確認は `features/qni_run.feature` と Kata の機能ファイルに限定する。

**使用技術:** Ruby, Cucumber, Bundler, `qni-cli`

---

## ファイル構成

- 変更: `features/katas/basic_gates.feature`
  - `Task 1.1` の説明用記号表示シナリオを 1 本追加する。
- 検証: `features/qni_run.feature`
  - `qni run --symbolic` の既存振る舞いが回帰していないことを確認する。
- 検証: `features/katas/basic_gates.feature`
  - 既存の数値ケース、制御ゲート検証、追加した記号表示ケースが共存して成功することを確認する。

## タスク 1: 失敗する記号表示 Kata シナリオを先に追加する

**対象ファイル:**
- 変更: `features/katas/basic_gates.feature`
- テスト: `features/katas/basic_gates.feature`

- [ ] **手順 1: 新しい記号表示シナリオを書く**

`features/katas/basic_gates.feature` に次のシナリオを追加する。

```gherkin
  シナリオ: Task 1.1 は記号表示で一般式の反転を示す
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    かつ "qni add X --qubit 0 --step 1" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      sin(theta/2)|0> + cos(theta/2)|1>
      """
```

- [ ] **手順 2: 対象の Kata 機能ファイルだけを実行し、正しい理由で失敗することを確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

期待結果:

- 新規の記号表示シナリオだけが失敗する
- 失敗理由は期待文字列不一致か、`qni run --symbolic` の実際の出力との差にある
- 既存の数値シナリオと制御ゲートシナリオは引き続き成功する

- [ ] **手順 3: 失敗する機能ファイルをコミットする**

```bash
git add features/katas/basic_gates.feature
git commit -m "test: add symbolic Task 1.1 scenario"
```

## タスク 2: 実際の記号表示出力に合うまで Kata 機能ファイルを最小限調整する

**対象ファイル:**
- 変更: `features/katas/basic_gates.feature`
- テスト: `features/katas/basic_gates.feature`

- [ ] **手順 1: 失敗しているシナリオだけを再実行し、実際の出力を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature:52
```

期待結果:

- 実際の記号表示出力が 1 行で見える
- 期待値との差分が文字列レベルで確認できる

- [ ] **手順 2: 可能な限り小さい修正を行う**

変更は次のどちらかに限定する。

- ヘルパーの既存出力が正しいなら、機能ファイルの期待文字列だけを修正する
- ヘルパーの出力が `qni_run.feature` の既存方針と矛盾するなら、この計画を止めて新しい仕様書 / 計画書に戻る

このタスクでは製品コードを新たに変更しない。

- [ ] **手順 3: Kata 機能ファイルを再実行し、成功することを確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates.feature
```

期待結果:

- 追加した記号表示シナリオを含めて `features/katas/basic_gates.feature` が成功する

- [ ] **手順 4: 修正したシナリオをコミットする**

```bash
git add features/katas/basic_gates.feature
git commit -m "test: document Task 1.1 with symbolic run"
```

## タスク 3: 周辺の回帰を検証する

**対象ファイル:**
- 検証: `features/katas/basic_gates.feature`
- 検証: `features/qni_run.feature`

- [ ] **手順 1: 対象を絞った回帰確認を実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature features/katas/basic_gates.feature
```

期待結果:

- 成功
- `qni run --symbolic` の既存機能が回帰していない
- `Task 1.1` の数値・制御ゲート・記号表示の 3 系統が共存して成功する

- [ ] **手順 2: 最終差分を確認する**

確認:

- 変更が `features/katas/basic_gates.feature` だけに収まっている
- 製品コードに変更がない

- [ ] **手順 3: 検証の区切りをコミットする**

```bash
git add features/katas/basic_gates.feature
git commit -m "test: verify symbolic Task 1.1 coverage"
```

## メモ

- 今回の目的は正しさの強化ではなく、`Task 1.1` の一般式を `qni-cli` だけで読めるようにすること。
- 数値シナリオと制御ゲート検証シナリオは削除しない。
- 実際の記号表示出力が仕様と異なる場合は、まず `qni_run.feature` の既存仕様と整合しているかを確認し、整合しているなら Kata の機能ファイル側の期待値を合わせる。
