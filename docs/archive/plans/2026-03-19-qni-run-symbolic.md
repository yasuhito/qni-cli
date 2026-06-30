# qni run --symbolic 実装計画

> **アーカイブ:** この文書は完了済みの過去計画です。現在の実装指示としては使いません。

**目標:** `qni run --symbolic` を追加し、1 qubit 回路について `α|0> + β|1>` 形式の状態表示と未束縛角度変数の記号表示を提供する。

**構成:** 既存の数値 `qni run` はそのまま維持し、`--symbolic` 指定時だけ Ruby から Python/SymPy ヘルパーをサブプロセスで呼び出す。Ruby 側は CLI オプション、入力 JSON の受け渡し、対象外エラーの整形を担当し、Python 側は 1 qubit の記号的な状態遷移と `α|0> + β|1>` 形式の文字列表現生成を担当する。

**技術構成:** Ruby, Thor, Cucumber, Python 3, SymPy, Open3, Bundler

---

## ファイル構成

- 変更: `features/qni_run.feature`
  - `qni run --symbolic` の振る舞いを先に固定する。
- 変更: `lib/qni/cli.rb`
  - `run` に `--symbolic` オプションを追加し、記号表示の経路へ分岐する。
- 変更: `lib/qni/simulator.rb`
  - 数値表示と記号表示を分離し、`render_symbolic_state_vector` を追加する。
- 作成: `lib/qni/symbolic_state_renderer.rb`
  - Python ヘルパー呼び出し、JSON 入出力、1 qubit 制約、ヘルパーエラー整形を担当する。
- 作成: `libexec/qni_symbolic_run.py`
  - SymPy で 1 qubit 状態ベクトルを記号的に計算し、`α|0> + β|1>` 形式へ整形する。
- 確認: `features/qni_cli.feature`
  - `run` オプション追加が他コマンドのヘルプ表示に影響していないことを確認する。

## タスク 1: 先に失敗する `--symbolic` 実行シナリオを追加する

**対象ファイル:**
- 変更: `features/qni_run.feature`
- テスト: `features/qni_run.feature`

- [ ] **手順 1: 失敗する `--symbolic` シナリオを書く**

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

- [ ] **手順 2: 対象を絞った機能仕様を実行し、想定どおりの理由で失敗することを確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature
```

期待結果:

- 新規 4 シナリオが失敗する
- 失敗理由は `--symbolic` が未対応であることを示す
- 既存の `qni run` シナリオは引き続き成功する

- [ ] **手順 3: 失敗する機能仕様をコミットする**

```bash
git add features/qni_run.feature
git commit -m "test: add symbolic run scenarios"
```

## タスク 2: Ruby CLI の接続処理とサブプロセス境界を追加する

**対象ファイル:**
- 変更: `lib/qni/cli.rb`
- 変更: `lib/qni/simulator.rb`
- 作成: `lib/qni/symbolic_state_renderer.rb`
- テスト: `features/qni_run.feature`

- [ ] **手順 1: 対象を絞った失敗シナリオを 1 つ再実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature:330
```

期待結果:

- `qni run --symbolic` が未対応で落ちることを再確認する

- [ ] **手順 2: 最小限の CLI オプションと分岐を追加する**

`lib/qni/cli.rb` で `run` に boolean 型の `--symbolic` オプションを追加し、`Simulator.new(circuit)` を次のように分岐させる。

```ruby
method_option :symbolic, type: :boolean, default: false, desc: 'Show a 1-qubit symbolic state expression'

def simulate
  circuit = current_circuit_file.load
  simulator = Simulator.new(circuit)
  puts options[:symbolic] ? simulator.render_symbolic_state_vector : simulator.render_state_vector
end
```

- [ ] **手順 3: 専用の Ruby 表示ラッパーを作成する**

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

ここではヘルパー不在、`python3` 不在、`sympy` のインポート失敗も `Simulator::Error` に変換する。

- [ ] **手順 4: ラッパーを `Simulator` につなぐ**

`lib/qni/simulator.rb` に次を追加する。

```ruby
def render_symbolic_state_vector
  SymbolicStateRenderer.new(data).render
end
```

- [ ] **手順 5: 対象を絞った機能仕様を再実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature
```

期待結果:

- 2 qubit の対象外エラーは通る
- 1 qubit の `--symbolic` シナリオはヘルパー未実装のためまだ失敗する

- [ ] **手順 6: Ruby 側の境界をコミットする**

```bash
git add lib/qni/cli.rb lib/qni/simulator.rb lib/qni/symbolic_state_renderer.rb features/qni_run.feature
git commit -m "feat: add symbolic run plumbing"
```

## タスク 3: SymPy ヘルパーを最小限実装する

**対象ファイル:**
- 作成: `libexec/qni_symbolic_run.py`
- テスト: `features/qni_run.feature`

- [ ] **手順 1: 失敗する `--symbolic` シナリオを 1 つ再実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature:330
```

期待結果:

- ヘルパー未実装かインポート失敗で失敗する

- [ ] **手順 2: 最小限の 1 qubit 記号シミュレーターを実装する**

`libexec/qni_symbolic_run.py` に次の責務を実装する。

- 標準入力から circuit JSON を読む
- `qubits != 1` なら標準エラーへ `symbolic run currently supports only 1-qubit circuits` を出して `exit(1)`
- 初期状態を `Matrix([1, 0])` にする
- 各 col の唯一の要素を順に適用する
- 離散ゲートは 2x2 SymPy `Matrix` で持つ
- 角度付きゲートはゲート文字列から角度を取り出し、variables にあれば値へ置換し、なければ `Symbol` として扱う
- 最終振幅を `simplify` し、0 でない項だけを `coeff|basis>` へ整形して標準出力に出す

最低限必要なゲート表は次のとおり。

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

- [ ] **手順 3: 対象を絞った機能仕様を実行し、成功することを確認する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature
```

期待結果:

- 新規 4 シナリオが成功する
- 既存の `qni run` 数値シナリオも成功する

- [ ] **手順 4: ヘルパーをコミットする**

```bash
git add libexec/qni_symbolic_run.py features/qni_run.feature lib/qni/cli.rb lib/qni/simulator.rb lib/qni/symbolic_state_renderer.rb
git commit -m "feat: add symbolic state rendering"
```

## タスク 4: 回帰と近接する CLI の振る舞いを確認する

**対象ファイル:**
- 確認: `features/qni_run.feature`
- 確認: `features/qni_cli.feature`
- 確認: `features/katas/basic_gates.feature`

- [ ] **手順 1: 対象を絞った回帰確認を実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber features/qni_run.feature features/qni_cli.feature features/katas/basic_gates.feature
```

期待結果:

- 成功
- `タスク 1.1` の既存 kata 機能仕様が回帰していない
- `qni run` の既定 CSV 出力が回帰していない

- [ ] **手順 2: 全体テストを実行する**

実行:

```bash
BUNDLE_PATH=/home/yasuhito/Work/qni-cli/.bundle/vendor /home/yasuhito/.local/share/gem/ruby/3.4.0/bin/bundle exec cucumber
```

期待結果:

- 成功
- 機能仕様全体が成功する

- [ ] **手順 3: 最終差分を確認する**

確認:

- 新しい実装ファイルが `lib/qni/symbolic_state_renderer.rb` と `libexec/qni_symbolic_run.py` に限定されている
- 既存の数値シミュレーターの振る舞いを壊していない
- `run --symbolic` の 1 qubit 限定が明確に表現されている

- [ ] **手順 4: 検証の区切りをコミットする**

```bash
git add features/qni_run.feature features/qni_cli.feature features/katas/basic_gates.feature lib/qni/cli.rb lib/qni/simulator.rb lib/qni/symbolic_state_renderer.rb libexec/qni_symbolic_run.py
git commit -m "test: verify symbolic run behavior"
```

## メモ

- 今回の対象範囲は 1 qubit の `qni run --symbolic` に限定する。2 qubit 以上の記号表示は次段に切る。
- 数値 `qni run` は未束縛変数で従来どおり失敗させる。`qni run --symbolic` だけが未束縛変数を許容する。
- `qni run --symbolic` は新しいコマンドではなく既存 `run` の任意指定の表示モードとして実装する。
- Python ヘルパーの依存解決で詰まった場合は、ヘルパー呼び出し経路だけを一旦失敗メッセージ付きで通し、新しい仕様書 / 計画書で依存導入を切り出す。
