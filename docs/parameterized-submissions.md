# 可変入力の回路生成器

`neutral-parameterized-circuit-json-v1` は有限個の入力による数値採点の提出形式。全定義域の記号証明とは別のプロトコルである。[ADR 0030](adr/0030-use-bounded-parameterized-json-for-variable-input-tasks.md) を参照。

```json
{
  "protocol": "neutral-parameterized-circuit-json-v1",
  "inputs": [{ "name": "n", "type": "int", "min": 1, "max": 8 }],
  "qubits": { "input": "n" },
  "body": [
    { "gate": "H", "targets": { "array": [0] } },
    {
      "for": "i",
      "from": 1,
      "to": { "input": "n" },
      "body": [
        {
          "gate": "CNOT",
          "controls": { "array": [0] },
          "targets": { "array": [{ "var": "i" }] }
        }
      ]
    }
  ]
}
```

## 宣言と式

`inputs` は課題の宣言と順序を含めて一致させる。`int` / `real` は閉区間 min/max、`bits` は真偽値配列の長さ min/max、`bool` は min/maxなし。変数名は小文字英字で開始し英小文字・数字・アンダースコア32文字以内。課題本文の入力間条件（同じ長さ、異なる列、添字の順序、2の冪など）は採点者がケース作成時に保証する。宣言だけで入力間関係を証明する形式ではない。

式は数値、真偽値、またはキーが一つのオブジェクト。

- `{"input":"n"}` / `{"var":"i"}`、`{"pi":true}`。
- 二引数の配列: add/sub/mul/div/mod/pow、eq/ne/lt/le、and/or、at。
- 一引数: len/neg/not/sqrt/sin/cos/asin/acos/floor。
- `{"array":[式,…]}`、`{"range":[開始,終了]}`（半開区間）。
- `{"select":[条件,真の式,偽の式]}`。選択された式だけを評価する。

暗黙の型変換はしない。eq/neは同じ型のスカラーのみ。sqrt と逆三角関数は実数主値、角度はラジアン。非有限値・範囲外の添字は不合格。配列の全体等価比較や文字列式はない。

## 文

- ゲート: `gate`, 配列式 `targets`, 必要なら配列式 `controls` と数値式 `angle`。
- 有限ループ: `for`（変数名）, `from`, `to`, `body`。開始を含み終了を含まない整数範囲。
- 分岐: `if`, `then`, 省略可能な `else`。
- ローカル変数: `{"let":"pivot","value":-1}`、既存変数の更新 `{"set":"pivot","value":式}`。

ローカル宣言はそのbodyだけ有効。内側から外側の変数をsetできるが型は変更できない。シャドーイングは禁止。各ケースの環境は独立。

ゲート語彙は X/Y/Z/H/Rx/Ry/Rz/Phase/GlobalPhase/CNOT/CZ/MCX/CRx/CRy/SWAP。ただし**課題の available_gates に宣言した名前だけ**を使える。ゲート名から任意の制御数を推論しない。MCXの制御は1個以上。制御と標的の重複、指定幅外の量子ビット、不要な角度は禁止。GlobalPhaseは位相検証用に課題が明示許可する。

## 課題と採点

YAMLの `parameterized` に protocol/inputs/mode/tolerance/up_to_global_phase/cases を置く。各caseは id/inputs/qubits、任意の hidden、状態なら全振幅列 expected (`real`/`imaginary`)、ユニタリなら reference_circuit (`qubits`/`cols`) を持つ。指定幅は1〜8。参照やhiddenを提出側から参照する演算はない。

```sh
qni benchmark run benchmarks/quantum-katas-parameterized/superposition/ghz-state.md answer.json --json
qni benchmark run-all benchmarks/quantum-katas-parameterized benchmarks/solutions/quantum-katas-parameterized
```

全ケースで合格したときだけ合格。状態準備はゼロ入力・全体位相許容、ユニタリは全計算基底入力をF2で比較する。RotationGateは全体位相も厳密。JSON結果に submissionProtocol、gradingCases（caseId/status/checks/error）を保存するが、入力値・参照は出力しない。公開配布したケースのhidden分類は秘密を保証しない。本番の未公開ケースは評価者の私有課題ファイルで管理する。

資源上限はADRの通り。ホストAPI・任意コード・再帰・while・測定は提供しない。ケース内の解釈予算に空ループも数える。旧数値版と記号版を維持し、過去の研究試行は再採点しない。研究記録には `research record --submissions` を使い、他形式と混ぜない。`research solve` と旧中立JSON変換には未対応で、明示エラーになる。
