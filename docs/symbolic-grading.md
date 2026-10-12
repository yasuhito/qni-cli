# 固定幅・連続引数の記号採点

固定量子ビット数で角度だけが変わる課題の**主採点**です。有限個の角度での数値一致ではなく、宣言した全引数での等価性を証明します。設計判断は [ADR 0029](adr/0029-use-symbolic-proof-for-fixed-width-parameter-tasks.md)。可変 N/配列の複数値数値採点は別 PR です。

## 実行

```sh
bash scripts/setup_symbolic_python.sh
npm run build
node dist/bin/qni.js benchmark run-all benchmarks/quantum-katas-symbolic benchmarks/solutions/quantum-katas-symbolic
```

記号版は4課題・標準解4件。履歴互換の数値版63課題は変更していません。合わせて67課題ファイルですが、上流課題の種類は増えていません。一括実行は記号課題に対応する `.json`、既存課題に対応する `.qni` を読みます。

```text
PASS benchmark suite
tasks: 4
passed: 4, failed: 0, disallowed: 0, error: 0
- passed basic-gates/phase-change-pi-over-3 PhaseChangePiOver3
- passed multi-qubit-gates/controlled-rotation ControlledRotation
- passed preparing-states/unequal-superposition UnequalSuperposition
- passed single-qubit-gates/amplitude-change AmplitudeChange
```

全ての合格行を含む実出力例は [benchmark.md](benchmark.md#記号版4課題の主採点) を参照してください。

## 新しい提出プロトコル

`neutral-symbolic-circuit-json-v1`。トップレベルのキーは次の4つだけです。量子ビット数・引数宣言は課題と厳密に一致させます。課題から独立した仮定や検証コードは提出できません。

```json
{
  "protocol": "neutral-symbolic-circuit-json-v1",
  "qubits": 1,
  "parameters": [{ "name": "alpha", "real": true, "domain": "real" }],
  "operations": [
    {
      "gate": "Ry",
      "targets": [0],
      "angle": { "mul": [{ "rational": ["2", "1"] }, { "parameter": "alpha" }] }
    }
  ]
}
```

- operations は順序付き。各操作は `gate`、1要素の `targets`、角度付きゲートだけ `angle`、制御ゲートだけ1要素の `controls` を持ちます。対象と制御は重複できません。q0 は最上位ビット。
- 名前は課題の `available_gates` にあるものだけ。PA で扱う実装語彙は X/Y/Z/H/S/T、P、Rx/Ry/Rz、CH/CRx/CRy/CRz/CNOT、GlobalPhase（課題で許可した場合のみ）。MCX や暗黙の制御追加はありません。
- 角度は**式文字列ではなく単一キーの構文木**。`{"rational":["分子","分母"]}`（正の分母）、`{"pi":true}`、`{"parameter":"alpha"}`、`{"add":[式,式,...]}`、`{"mul":[式,式,...]}`、`{"neg":式}`、`{"sin":式}`、`{"cos":式}`、`{"sqrt":式}`、`{"asin":式}`、`{"acos":式}`、`{"atan":式}`。
- sqrt は非負の主値。asin は [-π/2,π/2]、acos は [0,π]、atan は (-π/2,π/2) の実数主値。sqrt の引数が常に非負、asin/acos の引数が常に [-1,1] 内であることを保守的な区間計算で確認します。例えば `asin(sin(alpha))` は定義域内ですが、任意実数 `asin(alpha)` は拒否します。任意の除算・冪・式文字列・浮動小数点・複素角・条件分岐はありません。
- 定義域はこの段階では実数全域のみです。正規化制約付き振幅を直接引数にする機能は未対応。角度による状態準備は cos²α+sin²α=1、一般回路はユニタリゲートの積により正規化されます。
- 状態準備は |0…0>、変換課題はユニタリ全体。初期状態や補助量子ビットは提出できません。

## 結果の意味

`--json` は採点状態のほか、`submissionProtocol`、`symbolicAssumptions`、`checks[].proof: {verdict, reason}` を返します。引数の実数・定義域、幅、正規化、比較対象、位相方針は明示的に記録します。

`proved` だけが合格（exit0）。**`unproven` は不合格（exit1）**で、非零残差、証明器の不完全性、全域での式の定義を確認できない場合、不正な提出、時間切れ、資源不足を含みます。「誤りを証明した」という意味ではありません。浮動小数点や標本による救済はありません。これは SymPy の正確な簡約を信頼する記号証明であり、独立した検査器で検証できる証明書を生成する形式証明ではありません。区間計算は相関を保持しないので、例えば全実数で定義できる `sqrt(alpha*alpha)` でも定義域を確認できず不合格になります。SymPy 環境の欠落・故障、提出ファイルの不存在は `error`（exit3）。

位相は課題に従います。厳密比較では -1 倍も不合格。全体位相許容の状態準備は密度行列、ユニタリは U V† がスカラー恒等行列であることを検証します。共通位相は引数に依存してよいものの、入力ごとの異なる位相は許しません。零振幅でも位相基準の除算をしません。

制限は幅1〜4、引数8、操作64、式深さ16、式節点2048、加算/乗算の引数2〜8、整数32桁、提出64 KiB。親の15秒・CPU12秒・メモリ768 MiB制限で中断した場合も `unproven`。式節点の予算は参照と提出にそれぞれ独立して適用します。提出は開いた同一ファイル記述子で通常ファイルを確認し、最大64 KiB+1だけを読みます。FIFOやデバイスは拒否します。これらは安全なデータ言語であって、任意コードを実行するための隔離環境ではありません。採点器の補助プログラム・Python環境・依存は信頼できる管理下に置く必要があります。

## 研究試行と過去結果

外部で作った JSON 解答は `qni research record --submissions <JSONディレクトリ>` により、独立したプロトコルとして保存できます。数値版と記号版を1試行へ混ぜないでください。既存 `--circuit-json-dir` の変換は旧プロトコル専用です。`qni research solve` への新形式の統合は未対応で、誤って旧形式の回答を要求しないよう明示エラーにします。

ADR 0019 に従い、過去の `result.json` を再採点・変換しません。旧 `blind-neutral-circuit-json-v1` / `qni-command-output-v0` と本形式は別枠で比較します。
