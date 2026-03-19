# qni run --symbolic Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `qni run --symbolic` を追加し、1 qubit 回路について `α|0> + β|1>` 形式の状態表示と未束縛角度変数の記号表示を提供する。

**Architecture:** 既存の数値 `qni run` はそのまま維持し、`--symbolic` 指定時だけ Ruby から Python/SymPy helper を subprocess で呼び出す。Ruby 側は CLI オプション、入力 JSON の受け渡し、スコープ外エラーの整形を担当し、Python 側は 1 qubit の symbolic state evolution と `α|0> + β|1>` 形式の文字列表現生成を担当する。

**Tech Stack:** Ruby, Thor, Cucumber, Python 3, SymPy, Open3, Bundler

---

## File Structure

- Modify: `features/qni_run.feature`
  - `qni run --symbolic` の振る舞いを先に固定する。
- Modify: `lib/qni/cli.rb`
  - `run` に `--symbolic` オプションを追加し、symbolic rendering 経路へ分岐する。
- Modify: `lib/qni/simulator.rb`
  - 数値 rendering と symbolic rendering を分離し、`render_symbolic_state_vector` を追加する。
- Create: `lib/qni/symbolic_state_renderer.rb`
  - Python helper 呼び出し、JSON 入出力、1 qubit 制約、helper エラー整形を担当する。
- Create: `libexec/qni_symbolic_run.py`
  - SymPy で 1 qubit 状態ベクトルを記号的に計算し、`α|0> + β|1>` 形式へ整形する。
- Verify: `features/qni_cli.feature`
  - `run` オプション追加が他コマンドの help 表示に影響していないことを確認する。

## Task 1: Add failing symbolic run scenarios first

**Files:**
- Modify: `features/qni_run.feature`
- Test: `features/qni_run.feature`

- [ ] **Step 1: Write the failing symbolic scenarios**

`features/qni_run.feature` に次の 4 シナリオを追加する。

```gherkin
  シナリオ: qni run --symbolic は H ゲートの状態を ket 形式で表示
    前提 "qni add H --qubit 0 --step 0" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      0.7071067811865475|0> + 0.7071067811865475|1>
      """

  シナリオ: qni run --symbolic は Y ゲートの純虚数係数を表示
    前提 "qni add Y --qubit 0 --step 0" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      1.0i|1>
      """

  シナリオ: qni run --symbolic は未束縛の角度変数を記号のまま表示
    前提 "qni add Ry --angle theta --qubit 0 --step 0" を実行
    もし "qni run --symbolic" を実行
    ならば 標準出力:
      """
      cos(theta/2)|0> + sin(theta/2)|1>
      """

  シナリオ: qni run --symbolic は 2 qubit 回路では失敗
    前提 空の 2 qubit 回路がある
    もし "qni run --symbolic" を実行
    ならば コマンドは失敗
    かつ 標準エラー:
      """
      symbolic run currently supports only 1-qubit circuits
      """
```

- [ ] **Step 2: Run the focused feature and verify it fails for the right reason**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature
```

Expected:

- 新規 4 シナリオが失敗する
- 失敗理由は `--symbolic` が未対応であることを示す
- 既存の `qni run` シナリオは引き続き green

- [ ] **Step 3: Commit the failing feature**

```bash
git add features/qni_run.feature
git commit -m "test: add symbolic run scenarios"
```

## Task 2: Add Ruby CLI plumbing and subprocess boundary

**Files:**
- Modify: `lib/qni/cli.rb`
- Modify: `lib/qni/simulator.rb`
- Create: `lib/qni/symbolic_state_renderer.rb`
- Test: `features/qni_run.feature`

- [ ] **Step 1: Re-run one focused failing scenario**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature:330
```

Expected:

- `qni run --symbolic` が未対応で落ちることを再確認する

- [ ] **Step 2: Add the minimal CLI option and routing**

`lib/qni/cli.rb` で `run` に boolean の `--symbolic` オプションを追加し、`Simulator.new(circuit)` を次のように分岐させる。

```ruby
method_option :symbolic, type: :boolean, default: false, desc: 'Show a 1-qubit symbolic state expression'

def simulate
  circuit = current_circuit_file.load
  simulator = Simulator.new(circuit)
  puts options[:symbolic] ? simulator.render_symbolic_state_vector : simulator.render_state_vector
end
```

- [ ] **Step 3: Create a dedicated Ruby renderer wrapper**

`lib/qni/symbolic_state_renderer.rb` に、責務を次だけに絞ったクラスを作る。

```ruby
module Qni
  class SymbolicStateRenderer
    def initialize(circuit_hash)
      @circuit_hash = circuit_hash
    end

    def render
      raise Simulator::Error, 'symbolic run currently supports only 1-qubit circuits' unless one_qubit?

      stdout, stderr, status = Open3.capture3(
        'python3',
        helper_path,
        stdin_data: JSON.generate(circuit_hash)
      )
      raise Simulator::Error, stderr.strip unless status.success?

      stdout.strip
    end
  end
end
```

ここでは helper 不在、`python3` 不在、`sympy` import failure も `Simulator::Error` に変換する。

- [ ] **Step 4: Hook the wrapper into `Simulator`**

`lib/qni/simulator.rb` に次を追加する。

```ruby
def render_symbolic_state_vector
  SymbolicStateRenderer.new(data).render
end
```

- [ ] **Step 5: Run the focused feature again**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature
```

Expected:

- 2 qubit の scope エラーは通る
- 1 qubit の symbolic シナリオは helper 未実装のためまだ失敗する

- [ ] **Step 6: Commit the Ruby-side boundary**

```bash
git add lib/qni/cli.rb lib/qni/simulator.rb lib/qni/symbolic_state_renderer.rb features/qni_run.feature
git commit -m "feat: add symbolic run plumbing"
```

## Task 3: Implement the SymPy helper minimally

**Files:**
- Create: `libexec/qni_symbolic_run.py`
- Test: `features/qni_run.feature`

- [ ] **Step 1: Re-run one failing symbolic scenario**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature:330
```

Expected:

- helper 未実装か import failure で失敗する

- [ ] **Step 2: Implement the minimal 1-qubit symbolic simulator**

`libexec/qni_symbolic_run.py` に次の責務を実装する。

- stdin から circuit JSON を読む
- `qubits != 1` なら標準エラーへ `symbolic run currently supports only 1-qubit circuits` を出して `exit(1)`
- 初期状態を `Matrix([1, 0])` にする
- 各 col の唯一の要素を順に適用する
- 離散ゲートは 2x2 SymPy `Matrix` で持つ
- 角度付きゲートは gate 文字列から角度を取り出し、variables にあれば値へ置換し、なければ `Symbol` として扱う
- 最終振幅を `simplify` し、0 でない項だけを `coeff|basis>` へ整形して stdout に出す

最低限必要な gate table は次のとおり。

```python
H = Matrix([[sqrt(2)/2, sqrt(2)/2], [sqrt(2)/2, -sqrt(2)/2]])
X = Matrix([[0, 1], [1, 0]])
Y = Matrix([[0, -I], [I, 0]])
Z = Matrix([[1, 0], [0, -1]])
S = Matrix([[1, 0], [0, I]])
Sd = Matrix([[1, 0], [0, -I]])
T = Matrix([[1, 0], [0, exp(I*pi/4)]])
Td = Matrix([[1, 0], [0, exp(-I*pi/4)]])
SqrtX = Matrix([[1 + I, 1 - I], [1 - I, 1 + I]]) / 2
P(phi) = Matrix([[1, 0], [0, exp(I*phi)]])
Rx(phi) = Matrix([[cos(phi/2), -I*sin(phi/2)], [-I*sin(phi/2), cos(phi/2)]])
Ry(phi) = Matrix([[cos(phi/2), -sin(phi/2)], [sin(phi/2), cos(phi/2)]])
Rz(phi) = Matrix([[exp(-I*phi/2), 0], [0, exp(I*phi/2)]])
```

- [ ] **Step 3: Run the focused feature and verify it turns green**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature
```

Expected:

- 新規 4 シナリオが green
- 既存の `qni run` 数値シナリオも green

- [ ] **Step 4: Commit the helper**

```bash
git add libexec/qni_symbolic_run.py features/qni_run.feature lib/qni/cli.rb lib/qni/simulator.rb lib/qni/symbolic_state_renderer.rb
git commit -m "feat: add symbolic state rendering"
```

## Task 4: Verify regressions and nearby CLI behavior

**Files:**
- Verify: `features/qni_run.feature`
- Verify: `features/qni_cli.feature`
- Verify: `features/katas/basic_gates.feature`

- [ ] **Step 1: Run the targeted regression set**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature features/qni_cli.feature features/katas/basic_gates.feature
```

Expected:

- PASS
- `Task 1.1` の既存 kata feature が回帰していない
- `qni run` の既定 CSV 出力が回帰していない

- [ ] **Step 2: Run the full suite**

Run:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber
```

Expected:

- PASS
- feature 全体が green

- [ ] **Step 3: Inspect final diff**

Check:

- 新しい product file が `lib/qni/symbolic_state_renderer.rb` と `libexec/qni_symbolic_run.py` に限定されている
- 既存の数値 simulator の振る舞いを壊していない
- `run --symbolic` の 1 qubit 限定が明確に表現されている

- [ ] **Step 4: Commit the verification checkpoint**

```bash
git add features/qni_run.feature features/qni_cli.feature features/katas/basic_gates.feature lib/qni/cli.rb lib/qni/simulator.rb lib/qni/symbolic_state_renderer.rb libexec/qni_symbolic_run.py
git commit -m "test: verify symbolic run behavior"
```

## Notes

- 今回のスコープは 1 qubit の `qni run --symbolic` に限定する。2 qubit 以上の symbolic display は次段に切る。
- 数値 `qni run` は未束縛変数で従来どおり失敗させる。`qni run --symbolic` だけが未束縛変数を許容する。
- `qni run --symbolic` は new command ではなく既存 `run` の opt-in 表示モードとして実装する。
- Python helper の依存解決で詰まった場合は、helper 呼び出し経路だけを一旦失敗メッセージ付きで通し、新しい spec / plan で依存導入を切り出す。
