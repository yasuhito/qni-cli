# BasicGates Task 1.4 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `BasicGates Task 1.4 AmplitudeChange` を `features/katas/basic_gates/amplitude_change.feature` に追加し、必要なら `2*alpha` と `-2*alpha` を扱える最小の angle expression 拡張を加えて、数値、controlled 検証、symbolic 表示の 3 つの観点で回帰テスト化する。

**Architecture:** 先に `amplitude_change.feature` を追加して赤を確認し、`Task 1.4` に必要な不足が angle expression にあることを実証する。赤の原因が `2*alpha` / `-2*alpha` なら、`AngleExpression` と symbolic helper に最小の式サポートを追加し、既存の `qni add Ry`、`qni variable set`、`qni run`、`qni expect`、`qni run --symbolic` の流れの上で task を通す。product code の変更は angle expression とその回帰だけに限定する。

**Tech Stack:** Ruby, Cucumber, Bundler, Python, SymPy, `qni-cli`

---

## File Structure

- Create: `features/katas/basic_gates/amplitude_change.feature`
  - `Task 1.4` の問題文、代表角度の数値シナリオ、controlled 検証、symbolic 説明シナリオを追加する。
- Modify: `features/add_ry_gate.feature`
  - `qni add Ry` が `2*alpha` のような角度式をそのまま保存できることを固定する。
- Modify: `features/qni_run.feature`
  - `Ry(2*alpha)` と `qni variable set alpha ...` の組み合わせで数値 run が通ること、未束縛なら従来どおり失敗することを固定する。
- Modify: `features/qni_expect.feature`
  - `Ry(-2*alpha)` を含む期待値計算が通ることを固定する。
- Modify: `lib/qni/angle_expression.rb`
  - `2*alpha` と `-2*alpha` のような最小限の乗算付き角度式を parse / serialize / resolve できるようにする。
- Modify: `libexec/qni_symbolic_run.py`
  - symbolic helper でも同じ角度式を解釈できるようにする。
- Verify: `features/katas/basic_gates/state_flip.feature`
  - `Task 1.1` が回帰していないことを確認する。
- Verify: `features/katas/basic_gates/basis_change.feature`
  - `Task 1.2` が回帰していないことを確認する。
- Verify: `features/katas/basic_gates/sign_flip.feature`
  - `Task 1.3` が回帰していないことを確認する。

## Task 1: `Task 1.4` feature を先に追加して赤を確認する

**Files:**
- Create: `features/katas/basic_gates/amplitude_change.feature`
- Test: `features/katas/basic_gates/amplitude_change.feature`

- [ ] **Step 1: `Task 1.4` の問題文とシナリオを書く**

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

  シナリオ: Task 1.4 の controlled 検証回路は control qubit を |0> に戻す
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

  シナリオ: Task 1.4 は symbolic 表示で一般式を示す
    前提 "qni add Ry --angle 2*alpha --qubit 0 --step 0" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      cos(alpha)|0> + sin(alpha)|1>
      """
```

- [ ] **Step 2: focused 実行で red を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/amplitude_change.feature
```

Expected:

- 少なくとも 1 本は失敗する
- 失敗原因が `invalid angle: 2*alpha`、`invalid angle: -2*alpha`、またはその周辺にあることを確認できる

- [ ] **Step 3: failing feature をコミットする**

```bash
git add features/katas/basic_gates/amplitude_change.feature
git commit -m "test: add Task 1.4 kata scenarios"
```

## Task 2: angle expression の不足を最小実装で埋める

**Files:**
- Modify: `features/add_ry_gate.feature`
- Modify: `features/qni_run.feature`
- Modify: `features/qni_expect.feature`
- Modify: `lib/qni/angle_expression.rb`
- Modify: `libexec/qni_symbolic_run.py`

- [ ] **Step 1: angle expression 回帰 feature を追加する**

次の性質を既存 feature に追加する。

- `qni add Ry --angle 2*alpha --qubit 0 --step 0` が `Ry(2*alpha)` を保存できる
- `qni add Ry --angle 2*alpha --qubit 0 --step 0` と `qni variable set alpha π/4` のあと `qni run` が `0.7071067811865476,0.7071067811865475` を返す
- `qni add Ry --angle -2*alpha --qubit 0 --step 0` と `qni variable set alpha π/4` のあと `qni run` が `0.7071067811865476,-0.7071067811865475` を返す
- `qni add Ry --angle 2*alpha --qubit 0 --step 0` のあと `qni run --symbolic` が `cos(alpha)|0> + sin(alpha)|1>` を返す

- [ ] **Step 2: 回帰 feature を実行して red を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/add_ry_gate.feature features/qni_run.feature features/qni_expect.feature
```

Expected:

- 新しい angle expression 関連シナリオが失敗する
- 失敗が parser / evaluator / symbolic helper のいずれかに絞られる

- [ ] **Step 3: `AngleExpression` に最小限の式サポートを追加する**

`lib/qni/angle_expression.rb` で、少なくとも次を扱えるようにする。

- 数字 × 変数: `2*alpha`
- 符号付き数字 × 変数: `-2*alpha`
- 数字 × π項: `2*π/3`
- 既存の数値、π項、単独変数との互換維持

この task では一般の四則演算 parser は作らない。`Task 1.4` に必要な最小表現だけを通す。

- [ ] **Step 4: symbolic helper に同じ式サポートを追加する**

`libexec/qni_symbolic_run.py` の `parse_angle` を、Ruby 側と同じ最小式に対応させる。
`2*alpha` が `2 * Symbol("alpha")` として扱われ、`simplify` 後に `cos(alpha)` / `sin(alpha)` まで落ちることを狙う。

- [ ] **Step 5: angle expression 回帰 feature を再実行して green を確認する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/add_ry_gate.feature features/qni_run.feature features/qni_expect.feature
```

Expected:

- 新しい angle expression シナリオを含めて PASS

- [ ] **Step 6: angle expression 拡張をコミットする**

```bash
git add features/add_ry_gate.feature features/qni_run.feature features/qni_expect.feature lib/qni/angle_expression.rb libexec/qni_symbolic_run.py
git commit -m "feat: support simple angle expressions"
```

## Task 3: `Task 1.4` feature を green にする

**Files:**
- Modify: `features/katas/basic_gates/amplitude_change.feature`
- Test: `features/katas/basic_gates/amplitude_change.feature`

- [ ] **Step 1: `Task 1.4` feature を再実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/amplitude_change.feature
```

Expected:

- 数値シナリオ、controlled 検証、symbolic 説明のいずれかが残っていれば expectation 差だけが見える

- [ ] **Step 2: feature の期待値を最小修正する**

変更は次に限定する。

- 数値の丸め差があれば expected stdout を実際の CLI 出力に合わせる
- symbolic の項順や係数表記が既存 `qni_run.feature` と整合しているなら、その表記に合わせる
- ここでさらに product code 不足が見つかった場合は、その原因を切り出して新しい spec / plan に戻る

- [ ] **Step 3: `Task 1.4` feature を green にする**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/katas/basic_gates/amplitude_change.feature
```

Expected:

- `Task 1.4` の feature が PASS

- [ ] **Step 4: `Task 1.4` をコミットする**

```bash
git add features/katas/basic_gates/amplitude_change.feature
git commit -m "test: document Task 1.4 amplitude change"
```

## Task 4: 近接回帰を確認する

**Files:**
- Verify: `features/katas/basic_gates/state_flip.feature`
- Verify: `features/katas/basic_gates/basis_change.feature`
- Verify: `features/katas/basic_gates/sign_flip.feature`
- Verify: `features/katas/basic_gates/amplitude_change.feature`
- Verify: `features/add_ry_gate.feature`
- Verify: `features/qni_run.feature`
- Verify: `features/qni_expect.feature`

- [ ] **Step 1: 近接回帰セットを実行する**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/add_ry_gate.feature features/qni_run.feature features/qni_expect.feature features/katas/basic_gates/state_flip.feature features/katas/basic_gates/basis_change.feature features/katas/basic_gates/sign_flip.feature features/katas/basic_gates/amplitude_change.feature
```

Expected:

- PASS
- `Task 1.1` から `Task 1.4` までが共存して green
- angle expression を使う `Ry` / `run` / `expect` が回帰していない

- [ ] **Step 2: 最終差分を確認する**

Check:

- 変更が `Task 1.4` と simple angle expression に必要な file に限られている
- unrelated な product code 変更がない

- [ ] **Step 3: 回帰確認のチェックポイントをコミットする**

```bash
git add features/katas/basic_gates/amplitude_change.feature features/add_ry_gate.feature features/qni_run.feature features/qni_expect.feature lib/qni/angle_expression.rb libexec/qni_symbolic_run.py
git commit -m "test: verify Task 1.4 kata coverage"
```

## Notes

- `Task 1.4` は `Task 1.1` から `Task 1.3` と違って self-adjoint ではないため、controlled 検証では逆角度 `-2*alpha` が必要になる。
- angle expression 拡張は「一般式 parser」ではなく、`Task 1.4` に必要な simple multiplication に限定する。
- symbolic helper の簡約は `cos(2*alpha/2)` を `cos(alpha)` に落とすことを期待するが、もし表記が少し違っても意味が等価で既存表示規則と整合していれば feature 側を合わせる。
