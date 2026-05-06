# BasicGates Task 1.4 実装計画

> **自律エージェント向け:** 必須: この計画を実行するときは、可能なら superpowers:subagent-driven-development を使い、使えない場合は superpowers:executing-plans を使う。手順の進捗管理にはチェックボックス形式 (`- [ ]`) を使う。

**目標:** `BasicGates Task 1.4 AmplitudeChange` を `features/katas/basic_gates/amplitude_change.feature` に追加し、必要なら `2*alpha` と `-2*alpha` を扱える最小の角度式拡張を加えて、数値、制御付き検証、記号表示の 3 つの観点で回帰テスト化する。

**構成方針:** 先に `amplitude_change.feature` を追加して赤を確認し、`Task 1.4` に必要な不足が角度式にあることを実証する。赤の原因が `2*alpha` / `-2*alpha` なら、`AngleExpression` と記号計算ヘルパーに最小の式対応を追加し、既存の `qni add Ry`、`qni variable set`、`qni run`、`qni expect`、`qni run --symbolic` の流れの上でタスクを通す。製品コードの変更は角度式とその回帰だけに限定する。

**使用技術:** Ruby, Cucumber, Bundler, Python, SymPy, `qni-cli`

---

## ファイル構成

- 作成: `features/katas/basic_gates/amplitude_change.feature`
  - `Task 1.4` の問題文、代表角度の数値シナリオ、制御付き検証、記号説明シナリオを追加する。
- 変更: `features/add_ry_gate.feature`
  - `qni add Ry` が `2*alpha` のような角度式をそのまま保存できることを固定する。
- 変更: `features/qni_run.feature`
  - `Ry(2*alpha)` と `qni variable set alpha ...` の組み合わせで数値実行が通ること、未束縛なら従来どおり失敗することを固定する。
- 変更: `features/qni_expect.feature`
  - `Ry(-2*alpha)` を含む期待値計算が通ることを固定する。
- 変更: `lib/qni/angle_expression.rb`
  - `2*alpha` と `-2*alpha` のような最小限の乗算付き角度式を解析、直列化、解決できるようにする。
- 変更: `libexec/qni_symbolic_run.py`
  - 記号計算ヘルパーでも同じ角度式を解釈できるようにする。
- 確認: `features/katas/basic_gates/state_flip.feature`
  - `Task 1.1` が回帰していないことを確認する。
- 確認: `features/katas/basic_gates/basis_change.feature`
  - `Task 1.2` が回帰していないことを確認する。
- 確認: `features/katas/basic_gates/sign_flip.feature`
  - `Task 1.3` が回帰していないことを確認する。

## 作業 1: `Task 1.4` の機能ファイルを先に追加して赤を確認する

**ファイル:**
- 作成: `features/katas/basic_gates/amplitude_change.feature`
- テスト: `features/katas/basic_gates/amplitude_change.feature`

- [ ] **手順 1: `Task 1.4` の問題文とシナリオを書く**

`features/katas/basic_gates/amplitude_change.feature` を新規作成し、少なくとも次を追加する。

```gherkin
# language: ja
機能: Quantum Katas BasicGates Task 1.4 AmplitudeChange
  Task 1.4 AmplitudeChange: |0⟩ を cos(alpha)|0⟩ + sin(alpha)|1⟩ に変える
  入力:
  角度 alpha
  1 量子ビットの状態 β|0⟩ + γ|1⟩
  目標:
  |0⟩ を cos(alpha)|0⟩ + sin(alpha)|1⟩ に変え、
  |1⟩ を -sin(alpha)|0⟩ + cos(alpha)|1⟩ に変える

  シナリオアウトライン: Task 1.4 は |0> に振幅変化を適用する
    前提 空の 1 qubit 回路がある
    かつ "qni add Ry --angle <double_alpha> --qubit 0 --step 0" を実行
    もし "qni run" を実行
    ならば 標準出力:
      """
      <state_vector>
      """

    例:
      | double_alpha | state_vector                    |
      | 0            | 1.0,0.0                         |
      | π/3          | 0.8660254037844387,0.5          |
      | π/2          | 0.7071067811865476,0.7071067811865475 |
      | π            | 6.123233995736766e-17,1.0       |

  シナリオ: Task 1.4 の制御付き検証回路は制御量子ビットを |0> に戻す
    前提 空の 2 qubit 回路がある
    かつ "qni add H --qubit 0 --step 0" を実行
    かつ "qni add Ry --angle 1.8545904360032246 --qubit 1 --step 1" を実行
    かつ "qni add Ry --angle 2*alpha --control 0 --qubit 1 --step 2" を実行
    かつ "qni variable set alpha π/3" を実行
    かつ "qni add Ry --angle -2*alpha --control 0 --qubit 1 --step 3" を実行
    かつ "qni add H --qubit 0 --step 4" を実行
    もし "qni expect ZI" を実行
    ならば 標準出力:
      """
      ZI=1.0
      """

  シナリオ: Task 1.4 は記号表示で一般式を示す
    前提 "qni add Ry --angle 2*alpha --qubit 0 --step 0" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      cos(alpha)|0> + sin(alpha)|1>
      """
```

- [ ] **手順 2: 絞り込んだ実行で赤を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/amplitude_change.feature
```

期待結果:

- 少なくとも 1 本は失敗する
- 失敗原因が `invalid angle: 2*alpha`、`invalid angle: -2*alpha`、またはその周辺にあることを確認できる

- [ ] **手順 3: 失敗する機能ファイルをコミットする**

```bash
git add features/katas/basic_gates/amplitude_change.feature
git commit -m "test: add Task 1.4 kata scenarios"
```

## 作業 2: 角度式の不足を最小実装で埋める

**ファイル:**
- 変更: `features/add_ry_gate.feature`
- 変更: `features/qni_run.feature`
- 変更: `features/qni_expect.feature`
- 変更: `lib/qni/angle_expression.rb`
- 変更: `libexec/qni_symbolic_run.py`

- [ ] **手順 1: 角度式の回帰シナリオを追加する**

次の性質を既存の機能ファイルに追加する。

- `qni add Ry --angle 2*alpha --qubit 0 --step 0` が `Ry(2*alpha)` を保存できる
- `qni add Ry --angle 2*alpha --qubit 0 --step 0` と `qni variable set alpha π/4` のあと `qni run` が `0.7071067811865476,0.7071067811865475` を返す
- `qni add Ry --angle -2*alpha --qubit 0 --step 0` と `qni variable set alpha π/4` のあと `qni run` が `0.7071067811865476,-0.7071067811865475` を返す
- `qni add Ry --angle 2*alpha --qubit 0 --step 0` のあと `qni run --symbolic` が `cos(alpha)|0> + sin(alpha)|1>` を返す

- [ ] **手順 2: 回帰シナリオを実行して赤を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/add_ry_gate.feature features/qni_run.feature features/qni_expect.feature
```

期待結果:

- 新しい角度式関連シナリオが失敗する
- 失敗が解析器、評価器、記号計算ヘルパーのいずれかに絞られる

- [ ] **手順 3: `AngleExpression` に最小限の式対応を追加する**

`lib/qni/angle_expression.rb` で、少なくとも次を扱えるようにする。

- 数字 × 変数: `2*alpha`
- 符号付き数字 × 変数: `-2*alpha`
- 数字 × π項: `2*π/3`
- 既存の数値、π項、単独変数との互換維持

このタスクでは一般の四則演算の解析器は作らない。`Task 1.4` に必要な最小表現だけを通す。

- [ ] **手順 4: 記号計算ヘルパーに同じ式対応を追加する**

`libexec/qni_symbolic_run.py` の `parse_angle` を、Ruby 側と同じ最小式に対応させる。
`2*alpha` が `2 * Symbol("alpha")` として扱われ、`simplify` 後に `cos(alpha)` / `sin(alpha)` まで落ちることを狙う。

- [ ] **手順 5: 角度式の回帰シナリオを再実行して成功を確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/add_ry_gate.feature features/qni_run.feature features/qni_expect.feature
```

期待結果:

- 新しい角度式シナリオを含めて成功する

- [ ] **手順 6: 角度式拡張をコミットする**

```bash
git add features/add_ry_gate.feature features/qni_run.feature features/qni_expect.feature lib/qni/angle_expression.rb libexec/qni_symbolic_run.py
git commit -m "feat: support simple angle expressions"
```

## 作業 3: `Task 1.4` の機能ファイルを成功させる

**ファイル:**
- 変更: `features/katas/basic_gates/amplitude_change.feature`
- テスト: `features/katas/basic_gates/amplitude_change.feature`

- [ ] **手順 1: `Task 1.4` の機能ファイルを再実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/amplitude_change.feature
```

期待結果:

- 数値シナリオ、制御付き検証、記号説明のいずれかが残っていれば期待値差だけが見える

- [ ] **手順 2: 機能ファイルの期待値を最小修正する**

変更は次に限定する。

- 数値の丸め差があれば期待される標準出力を実際の CLI 出力に合わせる
- 記号表示の項順や係数表記が既存 `qni_run.feature` と整合しているなら、その表記に合わせる
- ここでさらに製品コード不足が見つかった場合は、その原因を切り出して新しい仕様書や計画書に戻る

- [ ] **手順 3: `Task 1.4` の機能ファイルを成功させる**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/amplitude_change.feature
```

期待結果:

- `Task 1.4` の機能ファイルが成功する

- [ ] **手順 4: `Task 1.4` をコミットする**

```bash
git add features/katas/basic_gates/amplitude_change.feature
git commit -m "test: document Task 1.4 amplitude change"
```

## 作業 4: 近接回帰を確認する

**ファイル:**
- 確認: `features/katas/basic_gates/state_flip.feature`
- 確認: `features/katas/basic_gates/basis_change.feature`
- 確認: `features/katas/basic_gates/sign_flip.feature`
- 確認: `features/katas/basic_gates/amplitude_change.feature`
- 確認: `features/add_ry_gate.feature`
- 確認: `features/qni_run.feature`
- 確認: `features/qni_expect.feature`

- [ ] **手順 1: 近接回帰セットを実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/add_ry_gate.feature features/qni_run.feature features/qni_expect.feature features/katas/basic_gates/state_flip.feature features/katas/basic_gates/basis_change.feature features/katas/basic_gates/sign_flip.feature features/katas/basic_gates/amplitude_change.feature
```

期待結果:

- 成功する
- `Task 1.1` から `Task 1.4` までが共存して成功状態になる
- 角度式を使う `Ry` / `run` / `expect` が回帰していない

- [ ] **手順 2: 最終差分を確認する**

確認:

- 変更が `Task 1.4` と単純な角度式に必要なファイルに限られている
- 関係ない製品コード変更がない

- [ ] **手順 3: 回帰確認のチェックポイントをコミットする**

```bash
git add features/katas/basic_gates/amplitude_change.feature features/add_ry_gate.feature features/qni_run.feature features/qni_expect.feature lib/qni/angle_expression.rb libexec/qni_symbolic_run.py
git commit -m "test: verify Task 1.4 kata coverage"
```

## 補足

- `Task 1.4` は `Task 1.1` から `Task 1.3` と違って自己随伴ではないため、制御付き検証では逆角度 `-2*alpha` が必要になる。
- 角度式拡張は「一般式の解析器」ではなく、`Task 1.4` に必要な単純な乗算に限定する。
- 記号計算ヘルパーの簡約は `cos(2*alpha/2)` を `cos(alpha)` に落とすことを期待するが、もし表記が少し違っても意味が等価で既存表示規則と整合していれば機能ファイル側を合わせる。
