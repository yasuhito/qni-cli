# qni-cli SPEC

## 目的

`qni-cli` は、量子回路を表す JSON ファイルをコマンドラインから安全に更新し、内容を確認し、シミュレーション結果を読むためのツールとする。

MVP では、単一量子ビットゲート `H` / `X` / `Y` / `Z` / `S` / `S†` / `T` / `T†` / `√X` / `P(angle)` / `Rx(angle)` / `Ry(angle)` / `Rz(angle)` と、2 つの target qubit を持つ `SWAP` を任意の `step` と `qubit` に追加する `add` コマンド、指定したセルのゲートを取得する `gate` コマンド、角度変数を管理する `variable` コマンド、状態ベクトルを表示する `run` コマンド、Pauli 文字列の期待値を表示する `expect` コマンド、現在の回路ファイルを削除する `clear` コマンドを対象にする。単一量子ビットゲートには `--control` を付けた制御付き追加も含む。

## 実装言語

- 実装言語は Ruby とする。
- 2026-03-10 時点の最新安定版である Ruby 4.0.1 を開発ターゲットとする。
- 互換性の下限も Ruby 4.0.1 とし、MVP では旧系統の Ruby 互換は考慮しない。
- CLI 実装は可能な限り標準ライブラリ中心で構成し、JSON 読み書き、引数解析、ファイル置換は Ruby 標準機能で完結させる。

## 対象 JSON フォーマット

MVP は、以下のトップレベル構造を前提にする。

```json
{
  "qubits": 3,
  "cols": [
    ["H", 1, 1],
    [1, 1, 1],
    [1, "H", 1]
  ],
  "variables": {
    "theta": "π/4"
  }
}
```

### 必須フィールド

- `qubits`: 回路全体の量子ビット数。正の整数。
- `cols`: ステップごとの列配列。各要素は長さ `qubits` の配列。
- `variables`: 角度変数の連想配列。省略可。キーは ASCII 識別子、値は具体的な角度。

### セル値の扱い

- `1`: identity。何も置かれていない空きスロット。
- `"H"`: Hadamard ゲート。
- `"X"`: Pauli-X ゲート。
- `"Y"`: Pauli-Y ゲート。
- `"Z"`: Pauli-Z ゲート。
- `"S"`: Phase-S ゲート。
- `"S†"`: S dagger ゲート。
- `"T"`: Phase-T ゲート。
- `"T†"`: T dagger ゲート。
- `"X^½"`: `../qni` の JSON API に合わせた √X ゲートの保存表現。CLI 入力と `view` 表示では `√X` を使う。
- `"P(<angle>)"`: `../qni` に合わせた parameterized Phase ゲート。例: `"P(π/3)"`, `"P(theta)"`。
- `"Rx(<angle>)"`: `../qni` に合わせた X 軸回転ゲート。例: `"Rx(π/2)"`, `"Rx(theta)"`。
- `"Ry(<angle>)"`: `../qni` に合わせた Y 軸回転ゲート。例: `"Ry(π/2)"`, `"Ry(theta)"`。
- `"Rz(<angle>)"`: `../qni` に合わせた Z 軸回転ゲート。例: `"Rz(π/2)"`, `"Rz(theta)"`。
- `"Swap"`: SWAP ゲート。必ず同じ step に 2 個 1 組で置く。
- `"•"`: control 記号。control 付きゲートの control qubit を表す。
- それ以外の文字列や値は将来の拡張用として読み込み時に許容してよいが、MVP の `add` コマンドは `1` かどうかだけを見て空き判定する。

### CNOT / 制御ゲート表現

- `../qni` の `cols` JSON に合わせ、CNOT は同じ step の同じ列に control 記号 `"•"` と target ゲート `"X"` を置いて表す。
- 例として、control qubit `0`、target qubit `1` の CNOT は `["•", "X"]` とする。
- control qubit `1`、target qubit `0` の CNOT は `["X", "•"]` とする。
- 多重制御は `../qni` と同様に `"•"` を複数並べ、target 側には実際のゲート文字列を置く。
- つまり `qni-cli` では、CNOT を独立した `"CNOT"` セル値ではなく、「制御付き X ゲート」の列配置として扱う。

例:

```json
{
  "qubits": 2,
  "cols": [
    ["•", "X"]
  ]
}
```

### SWAP 表現

- `../qni` の `cols` JSON に合わせ、SWAP は同じ step の同じ列に `"Swap"` を 2 個置いて表す。
- 例として、target qubit `0` と `1` の SWAP は `["Swap", "Swap"]` とする。
- target は必ず 2 つで、1 個や 3 個以上の `"Swap"` は無効とする。

例:

```json
{
  "qubits": 2,
  "cols": [
    ["Swap", "Swap"]
  ]
}
```

### MVP での編集対象

- `add` コマンドが編集するのはトップレベルの `cols` である。
- `variable` コマンドが編集するのはトップレベルの `variables` である。
- `run` と `expect` は `cols` と `variables` の両方を読む。

## コマンド仕様

### コマンド名

```bash
qni add <gate> --step <step> --qubit <qubit>
```

```bash
qni add <gate> --control <control> --step <step> --qubit <qubit>
```

```bash
qni add <angled_gate> --angle <angle> --step <step> --qubit <qubit>
```

```bash
qni add <angled_gate> --angle <angle> --control <control> --step <step> --qubit <qubit>
```

```bash
qni add SWAP --step <step> --qubit <qubit0>,<qubit1>
```

```bash
qni gate --step <step> --qubit <qubit>
```

```bash
qni expect <pauli_string> [<pauli_string> ...]
```

```bash
qni clear
```

```bash
qni variable set <name> <angle>
```

```bash
qni variable list
```

```bash
qni variable unset <name>
```

```bash
qni variable clear
```

### 引数

- `<gate>`: 追加するゲート種別。MVP では `H` と `X` と `Y` と `Z` と `S` と `S†` と `T` と `T†` と `√X` と `P` と `Rx` と `Ry` と `Rz` と `SWAP` を許可する。`√X` は保存時に `"X^½"` に正規化する。
- `--step <step>`: 配置先または取得対象のステップ番号。0-based 整数。
- `--qubit <qubit>`: 配置先または取得対象の量子ビット番号。0-based 整数。`SWAP` の場合は `0,1` のようにカンマ区切りで 2 つ指定する。
- `--control <control>`: 制御量子ビット番号。カンマ区切りで複数指定できる。`X` と組み合わせた場合は CNOT / 多重制御 X を表す。
- `<angled_gate>`: `P`, `Rx`, `Ry`, `Rz` のいずれか。
- `--angle <angle>`: `P`, `Rx`, `Ry`, `Rz` に必須の角度。`π/3`, `pi/3`, `3*pi/4`, `0.5` のような具体角度か、`theta` のような ASCII 識別子を受け付ける。具体角度は保存時に `P(π/3)`, `Rx(π/2)` のような canonical form に正規化し、変数は `Ry(theta)` のようにそのまま保存する。
- `<pauli_string>`: `I`, `X`, `Y`, `Z` だけで構成された観測量文字列。長さは回路の `qubits` と一致必須。例: `Z`, `ZZ`, `XIX`, `ZZI`。
- `<name>`: ASCII 識別子。例: `theta`, `phi_1`。
- `qni variable set` の `<angle>`: 具体角度のみ。`π/4`, `pi/3`, `0.5` を受け付ける。変数参照の入れ子は許可しない。

### `gate` コマンド名

```bash
qni gate --step <step> --qubit <qubit>
```

### `run` コマンド名

```bash
qni run
```

### `expect` コマンド名

```bash
qni expect <pauli_string> [<pauli_string> ...]
```

### `clear` コマンド名

```bash
qni clear
```

### `variable` コマンド名

```bash
qni variable set <name> <angle>
qni variable list
qni variable unset <name>
qni variable clear
```

### 対象ファイル

- MVP の `add` コマンドは、カレントディレクトリの `./circuit.json` を固定で読み書きする。
- `gate` コマンドもカレントディレクトリの `./circuit.json` を読み込み対象にする。
- `clear` コマンドもカレントディレクトリの `./circuit.json` を削除対象にする。
- `variable` コマンドもカレントディレクトリの `./circuit.json` を対象にする。
- 更新対象ファイルを引数で切り替える機能は、MVP では持たない。
- 将来、`--file` のような明示オプションを追加する余地はあるが、初期実装では不要とする。
- `./circuit.json` が存在しない場合、`add` コマンドはファイルを自動作成してから更新する。
- `gate` コマンドは `./circuit.json` が存在するときだけ成功する。
- `qni variable set` は `./circuit.json` が存在するときだけ成功する。
- `qni variable list`, `qni variable unset`, `qni variable clear` は `./circuit.json` がなくても失敗しない。

### インデックス規約

- `step` と `qubit` はどちらも 0-based とする。
- 理由は、JSON の `cols[step][qubit]` と CLI 引数をそのまま対応させ、実装とデバッグを単純化するため。

## 動作仕様

`qni add` は次の手順で動作する。

1. カレントディレクトリの `./circuit.json` の存在を確認する。
2. ファイルが存在する場合は JSON として読み込む。
3. ファイルが存在しない場合は、指定された target を収められる最小の回路を生成する。
4. 回路が既存ファイル由来の場合、`qubits` が正の整数であることを検証する。
5. 回路が既存ファイル由来の場合、`cols` が配列であり、各列の長さが `qubits` に一致することを検証する。
6. 回路が既存ファイル由来の場合、`qubit` が現在の `qubits` 以上なら、不足分の qubit を `1` で埋めて自動拡張する。
7. `step` が既存の `cols` 長を超える場合、不足分の列を `1` で埋めて自動拡張する。
8. 指定された target セルがすべて `1` であることを確認する。
9. 単一量子ビットゲートなら対象セル 1 個を更新する。`√X` は `"X^½"` に、`P`, `Rx`, `Ry`, `Rz` はそれぞれ `"P(<angle>)"`, `"Rx(<angle>)"`, `"Ry(<angle>)"`, `"Rz(<angle>)"` に正規化して保存する。`SWAP` なら対象セル 2 個を `"Swap"` に更新する。
10. `./circuit.json` を更新後 JSON で上書きする。

`qni add <gate> --control ...` は、control に指定した qubit のセルがすべて `1` であることも確認し、同じ列に `"•"` を配置してから target 側に対象ゲートを置く。`P`, `Rx`, `Ry`, `Rz` の場合は target 側に角度付きの canonical form を置く。

`qni add SWAP --qubit 0,1 ...` は、2 つの target qubit が互いに異なり、対象セルがどちらも `1` であることを確認してから、同じ列に `"Swap"` を 2 個配置する。

`qni gate --step <step> --qubit <qubit>` は、既存の `./circuit.json` を読み込み、`cols[step][qubit]` のセル値を標準出力に表示する。例えばセル値が `"H"` なら `H` を表示する。指定セルが存在しない場合は失敗する。

`qni variable set <name> <angle>` は、既存の `./circuit.json` を読み込み、`variables.<name>` に具体角度を保存する。`qni variable unset <name>` はそのキーを削除し、`qni variable clear` は `variables` を空にする。削除後に空になった `variables` は JSON から省略してよい。

## 新規ファイル作成ルール

`./circuit.json` が存在しない場合、`add` は要求された座標を収められる最小の回路を生成する。

- `qubits = qubit + 1`
- `cols.length = step + 1`
- 各セルの初期値は `1`

例:

- `qni add H --step 0 --qubit 0`

生成される初期回路は次のとおり。

```json
{
  "qubits": 1,
  "cols": [
    [1]
  ]
}
```

その後、`cols[0][0]` を `"H"` に更新する。

## ステップ拡張ルール

`step` が現在の最終列を超えていてもエラーにはしない。

例:

- `qubits = 3`
- 現在の `cols.length = 2`
- `--step 4 --qubit 1`

この場合、`cols[2]`, `cols[3]`, `cols[4]` を `[1, 1, 1]` で追加し、最終的に `cols[4][1] = "H"` とする。

このルールにより、任意のステップ指定と回路末尾への追記を同じ仕組みで扱える。

## qubit 拡張ルール

`qubit` が現在の最終 qubit を超えていてもエラーにはしない。

例:

- 現在の `qubits = 1`
- 現在の `cols = [["H"]]`
- `--qubit 1 --step 0`

この場合、各列の末尾に `1` を追加してから `cols[0][1] = "H"` とする。

更新後:

```json
{
  "qubits": 2,
  "cols": [
    ["H", "H"]
  ]
}
```

### 先頭の空ステップの圧縮

追加後に回路先頭のステップがすべて `1` の場合、その先頭ステップは自動的に削除する。

例:

- `qni add H --step 1 --qubit 0`

更新後:

```json
{
  "qubits": 1,
  "cols": [
    ["H"]
  ]
}
```

この圧縮は先頭の空ステップにだけ適用し、途中や末尾の空ステップは残す。

### 先頭の空 qubit の圧縮

追加後に回路先頭の qubit がすべてのステップで `1` の場合、その先頭 qubit は自動的に削除する。

例:

- `qni add H --step 0 --qubit 1`

更新後:

```json
{
  "qubits": 1,
  "cols": [
    ["H"]
  ]
}
```

この圧縮は先頭の空 qubit にだけ適用し、途中や末尾の空 qubit は残す。

## 衝突時の扱い

対象セルが `1` 以外の場合、`add` は失敗する。

例:

- 既に `"H"` がある
- 別のゲート文字列がある
- 将来の制御記号 `"•"` やブロック参照 `"#qft"` がある

このときファイルは更新しない。

`add` は「空きスロットに新しいゲートを追加する」コマンドとして定義し、既存要素の上書きは将来の `set` や `replace` のような別コマンドで扱う。

## 出力仕様

### 成功時

- 終了コード: `0`
- 標準出力は空とする

### `run` 成功時

- 終了コード: `0`
- 標準出力に状態ベクトルをカンマ区切りで表示する
- 振幅は基底状態の順序どおりに並べる
- 実数振幅は Ruby の `Float#to_s` 相当の文字列表現を使う
- 複素振幅は `a+bi`, `a-bi`, `bi` の形で表示する
- 実部または虚部が `Float::EPSILON` 未満なら `0.0` とみなす
- 制御付き列は `"•"` を control、非 `1` / 非 `"•"` の 1 セルを target として解釈する

例:

```text
0.7071067811865475,0.7071067811865475
```

```text
0.0,1.0i
```

### `expect` 成功時

- 終了コード: `0`
- 標準出力に期待値を 1 行 1 観測量で表示する
- 出力形式は `PAULI_STRING=value`
- `value` は `run` と同じ数値書式を使う
- `expect` は `run` と同じ状態ベクトルシミュレーション結果の上で期待値を計算する
- 各 Pauli 文字列は `I`, `X`, `Y`, `Z` だけを使う
- 各 Pauli 文字列の長さは回路の `qubits` と一致必須

例:

```text
ZZ=1.0
XX=1.0
```

### `variable list` 成功時

- 終了コード: `0`
- 標準出力に `NAME=ANGLE` を 1 行 1 変数で表示する
- 変数名の辞書順で表示する
- 変数が 1 つもない場合、標準出力は空とする

例:

```text
phi=π/2
theta=π/4
```

### `clear` 成功時

- 終了コード: `0`
- 標準出力は空とする
- `./circuit.json` が存在する場合は削除する
- `./circuit.json` が存在しない場合も成功とする

### `view` 成功時

- 終了コード: `0`
- 標準出力に回路を 1 qubit 1 行のアスキーアートで表示する
- 表示上のゲート記号は 5 文字幅の 1 行セルで表示する
- `H` は `H`
- `X` は `⊕` を使う。表示環境の都合で `⊕` が使えない場合だけ `+` にフォールバックしてよい
- `Y` は `Y`
- `Z` は `Z`
- `S` は `S`
- `S†` は `S†`
- `T` は `T`
- `T†` は `T†`
- `X^½` は `√X`
- `P(<angle>)` は角度を省略して `P`
- `Rx(<angle>)` は `Rx`
- `Ry(<angle>)` は `Ry`
- `Rz(<angle>)` は `Rz`
- `"Swap"` は `X`
- `"•"` は `•`
- 1 文字ラベルは `--H--` のように表示し、2 文字ラベルは `--Rz-` のように 1 文字目を中央寄せする
- `√X` だけは視認性のため `-√X--` で表示する

例:

```text
q0: --•--
q1: -√X--
```

### 入力エラー・検証エラー

- 終了コード: `2`
- 標準エラーに原因を出す
- `run` と `expect` は、`Ry(theta)` のような変数付き角度がある場合、`variables.theta` が未設定なら失敗する

例:

```text
target slot is occupied: cols[1][0] = "X"
```

```text
unresolved angle variable: theta
```

### 想定外エラー

- 終了コード: `1`
- 標準エラーに簡潔なエラー内容を出す

## 書き込み仕様

- 書き込みは in-place 更新とする。
- 中途半端な破損を避けるため、実装では一時ファイルに書いてから rename する atomic write を前提とする。
- 出力 JSON は 2-space indent と末尾改行を標準とする。

## 使用例

### 例 1: 既存ステップに H を追加

```bash
qni add H --step 1 --qubit 0
```

更新前:

```json
{
  "qubits": 2,
  "cols": [
    [1, 1],
    [1, 1]
  ]
}
```

更新後:

```json
{
  "qubits": 2,
  "cols": [
    [1, 1],
    ["H", 1]
  ]
}
```

### 例 2: 末尾を自動拡張して追加

```bash
qni add H --step 3 --qubit 1
```

更新後:

```json
{
  "qubits": 2,
  "cols": [
    [1, 1],
    [1, 1],
    [1, 1],
    [1, "H"]
  ]
}
```

### 例 3: `circuit.json` がない状態で Phase ゲートを追加

```bash
qni add P --angle π/3 --step 0 --qubit 0
```

更新後:

```json
{
  "qubits": 1,
  "cols": [
    ["P(π/3)"]
  ]
}
```

### 例 4: `circuit.json` がない状態で Rx ゲートを追加

```bash
qni add Rx --angle π/2 --step 0 --qubit 0
```

更新後:

```json
{
  "qubits": 1,
  "cols": [
    ["Rx(π/2)"]
  ]
}
```

### 例 5: `circuit.json` がない状態で √X ゲートを追加

```bash
qni add √X --step 0 --qubit 0
```

更新後:

```json
{
  "qubits": 1,
  "cols": [
    ["X^½"]
  ]
}
```

### 例 6: `circuit.json` がない状態で新規作成して追加

```bash
qni add H --step 0 --qubit 0
```

更新後:

```json
{
  "qubits": 1,
  "cols": [
    ["H"]
  ]
}
```

### 例 7: Bell 状態の期待値を読む

```bash
qni add H --step 0 --qubit 0
qni add X --control 0 --step 1 --qubit 1
qni expect ZZ XX
```

出力:

```text
ZZ=1.0
XX=1.0
```

### 例 8: 回路を削除して作り直す

```bash
qni clear
```

### 例 9: 角度変数 `theta` を使って回路を再利用する

```bash
qni add H --step 0 --qubit 0
qni add X --control 0 --step 1 --qubit 1
qni add Ry --angle theta --step 2 --qubit 0
qni variable set theta π/4
qni expect ZZ ZX XZ XX
```

## 非目標

MVP では以下は扱わない。

- `H` / `X` / `Y` / `Z` / `S` / `S†` / `T` / `T†` / `√X` / `P(angle)` / `Rx(angle)` / `Ry(angle)` / `Rz(angle)` / `Swap` 以外のゲート追加
- `SWAP` 以外の複数量子ビットゲート
- 既存ゲートの上書き
- 更新対象 JSON ファイルの切り替え
- ステップ挿入による右シフト
- 複数箇所を 1 コマンドで同時更新する機能
- 測定ショットや確率分布のサンプリング

## 今後の拡張余地

- `set`, `remove`, `move` コマンド
- `--file <path>` による対象ファイル切り替え
- `--stdout` や `--dry-run` による非破壊出力
- JSON Schema の定義
