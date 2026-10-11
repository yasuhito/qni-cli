# 中立回路 JSON のゲート語彙

`blind-neutral-circuit-json-v1` の提出形式と `available_gates` の署名を定義します。CLI 固有の操作は解答者に見せません。提出と研究記録の手順は [benchmark.md](benchmark.md)、プロトコルの境界は [ADR 0022](adr/0022-separate-neutral-json-and-legacy-qni-protocols.md) を参照してください。

## 提出形式

トップレベルは `operations` だけを持つ JSON オブジェクトです。説明文、Markdown のコードフェンス、未知のキーは拒否します。各操作は `gate` と `targets` を持ち、必要な場合だけ `controls` と `angle` を持ちます。配列順に実行します。

```json
{
  "operations": [
    { "gate": "Ry", "angle": "pi/2", "targets": [0] },
    { "gate": "CH", "controls": [0], "targets": [1] },
    { "gate": "CRx", "angle": "-pi/3", "controls": [1], "targets": [2] },
    { "gate": "MCX", "controls": [0, 1, 2], "targets": [3] }
  ]
}
```

## 署名と引数数

`available_gates` は課題が許可する中立ゲートの署名を列挙します。署名中の引数名は説明用で、提出では `targets`、`controls`、`angle` に分けます。名前は大文字・小文字を区別します。

| 署名                                                                                        | controls の個数 | targets の個数 | angle |
| ------------------------------------------------------------------------------------------- | --------------- | -------------- | ----- |
| `X(target)`, `Y(target)`, `Z(target)`, `H(target)`, `S(target)`, `T(target)`                | 0               | 1              | 不可  |
| `Phase(angle, target)`（別名 `P`）                                                          | 0               | 1              | 必須  |
| `GlobalPhase(angle, target)`                                                                | 0               | 1              | 必須  |
| `Rx(angle, target)`, `Ry(angle, target)`, `Rz(angle, target)`                               | 0               | 1              | 必須  |
| `CNOT(control, target)`, `CZ(control, target)`                                              | 1               | 1              | 不可  |
| `CH(control, target)`                                                                       | 1               | 1              | 不可  |
| `ControlledPhase(angle, control, target)`                                                   | 1               | 1              | 必須  |
| `ControlledGlobalPhase(angle, control, target)`                                             | 1               | 1              | 必須  |
| `CRx(angle, control, target)`, `CRy(angle, control, target)`, `CRz(angle, control, target)` | 1               | 1              | 必須  |
| `Toffoli(control1, control2, target)`（別名 `CCNOT`）                                       | 2               | 1              | 不可  |
| `MCX(controls, target)`                                                                     | 1以上（可変長） | 1              | 不可  |
| `SWAP(target1, target2)`                                                                    | 0               | 2              | 不可  |
| `CSWAP(control, target1, target2)`                                                          | 1               | 2              | 不可  |

制御付きゲートは、すべての制御量子ビットが `1` の部分空間だけで対象に作用します。`MCX` は正の任意個数の制御を持つ X です。反制御は対象の制御量子ビットを X で挟んで表せます。

`MCX` は `X`、`CNOT`、`Toffoli` の別名ではありません。たとえば `Toffoli` だけを許可した課題で `MCX` は使えず、`MCX` だけを許可した課題で `CNOT` は使えません。既存の固定制御ゲートの引数数は変えません。同様に `H` の許可は `CH` の許可を含まず、`Rx` の許可は `CRx` の許可を含みません。

`Rx`、`Ry`、`Rz` はそれぞれ `exp(-i angle X/2)`、`exp(-i angle Y/2)`、`exp(-i angle Z/2)` です。`Rz` は `Phase` とグローバル位相が異なります。制御付き回転でも、この位相を含めて適用します。

## 角度と量子ビット

角度は有限な π 式を文字列で渡します。`pi/2`、`-π/3`、`2*pi`、`0.608*pi`、`0*pi` などが使えます。回転ゲートも既存の位相ゲートと同じ規約です。数値、数値だけの文字列、未束縛変数、構文不正、非有限値（例: `pi/0`）は拒否します。任意の固定角度を近似するときは π の小数係数として記述し、課題の許容誤差に合わせて精度を選びます。採点ケースごとの変数束縛はこの語彙拡張の対象外です。

量子ビット番号は0始まりの非負整数です。制御配列を省略すると空配列として扱います。重複や制御・対象の重なりなど、実行可能な回路としての制約は回路構築時にも検証されます。

形式、ゲート名、引数数、角度、課題の許可語彙に違反した提出は、研究試行で `disallowed` として保存されます。実装の判断は [ADR 0027](adr/0027-extend-neutral-gates-with-separate-mcx.md) に記録しています。
