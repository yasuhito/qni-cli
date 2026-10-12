# 固定幅・連続引数の記号採点

固定量子ビット数で角度だけが変わる課題の**主採点**です。有限個の角度での数値一致ではなく、宣言した全引数での等価性を証明します。設計判断は [ADR 0029](adr/0029-use-symbolic-proof-for-fixed-width-parameter-tasks.md)。可変 N/配列の複数値数値採点は別 PR です。

## 実行

```sh
bash scripts/setup_symbolic_python.sh
npm run build
node dist/bin/qni.js benchmark run-all benchmarks/quantum-katas-symbolic benchmarks/solutions/quantum-katas-symbolic
```

記号版は6課題・標準解6件。履歴互換の数値版63課題は変更していません。合わせて69課題ファイルですが、上流課題の種類は増えていません。一括実行は記号課題に対応する `.json`、既存課題に対応する `.qni` を読みます。

```text
PASS benchmark suite
tasks: 6
passed: 6, failed: 0, disallowed: 0, error: 0
- passed basic-gates/phase-change-pi-over-3 PhaseChangePiOver3
- passed multi-qubit-gates/controlled-rotation ControlledRotation
- passed preparing-states/unequal-superposition UnequalSuperposition
- passed single-qubit-gates/amplitude-change AmplitudeChange
- passed single-qubit-gates/prepare-arbitrary-state PrepareArbitraryState
- passed single-qubit-gates/prepare-rotated-state PrepareRotatedState
```

全ての合格行を含む実出力例は [benchmark.md](benchmark.md#記号版6課題の主採点) を参照してください。

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
- 定義域は `real`（実数全域）と `unit-interval`（閉区間 [-1,1]、[0,1]ではない）のみ。各引数は独立して宣言され、提出は課題と完全一致させます。任意区間や複数引数間の制約は未対応です。α∈[-1,1] では既存の保守的な区間計算で `sqrt(1-alpha*alpha)` を零振幅の端点も含めて定義できます（積の区間は [-1,1]、根号内は [0,2] と過大評価します）。角度 φ による状態準備は cos²φ+sin²φ=1、振幅による準備は α²+β²=1、一般回路はユニタリゲートの積により正規化されます。
- 状態準備は |0…0>、変換課題はユニタリ全体。初期状態や補助量子ビットは提出できません。

## 結果の意味

`--json` は採点状態のほか、`submissionProtocol`、`symbolicAssumptions`、`checks[].proof: {verdict, reason}` を返します。引数の実数・定義域、幅、正規化、比較対象、位相方針は明示的に記録します。

`proved` だけが合格（exit0）。**`unproven` は不合格（exit1）**で、非零残差、証明器の不完全性、全域での式の定義を確認できない場合、不正な提出、時間切れ、資源不足を含みます。「誤りを証明した」という意味ではありません。浮動小数点や標本による救済はありません。これは SymPy の正確な簡約を信頼する記号証明であり、独立した検査器で検証できる証明書を生成する形式証明ではありません。区間計算は相関を保持しないので、例えば実数全域の `sqrt(alpha*alpha)` でも保守的に定義域未確認として不合格になります。SymPy 環境の欠落・故障、提出ファイルの不存在は `error`（exit3）。

位相は課題に従います。厳密比較では -1 倍も不合格。全体位相許容の状態準備は密度行列、ユニタリは U V† がスカラー恒等行列であることを検証します。共通位相は引数に依存してよいものの、入力ごとの異なる位相は許しません。零振幅でも位相基準の除算をしません。

制限は幅1〜4、引数8、操作64、式深さ16、式節点2048、加算/乗算の引数2〜8、整数32桁、提出64 KiB。親の15秒・CPU12秒・メモリ768 MiB制限で中断した場合も `unproven`。式節点の予算は参照と提出にそれぞれ独立して適用します。提出は開いた同一ファイル記述子で通常ファイルを確認し、最大64 KiB+1だけを読みます。FIFOやデバイスは拒否します。これらは安全なデータ言語であって、任意コードを実行するための隔離環境ではありません。採点器の補助プログラム・Python環境・依存は信頼できる管理下に置く必要があります。

## 逆三角関数の状態準備（Stage PB）

| 課題                  | 引数・目標                                | 比較                     |
| --------------------- | ----------------------------------------- | ------------------------ |
| PrepareRotatedState   | φ∈ℝ、cos(φ)\|0> − i sin(φ)\|1>            | ゼロ入力・全体位相も厳密 |
| PrepareArbitraryState | α∈[-1,1]、θ∈ℝ、α\|0> + exp(iθ)√(1−α²)\|1> | ゼロ入力・全体位相も厳密 |

どちらも1量子ビット固定、補助量子ビットは禁止です。回転状態は上流の α²+β²=1 の全円を角度に再パラメータ化します。主値 asin(sin(φ)) 等への置換では全円の符号を保存できません。任意状態は β≥0 の上流本文を採用し、標準解は Ry(2 acos(α)) → P(θ)。acos の主値 [0,π] により負の α と端点 α=±1 を保存します。θ は独立した実数で、振幅の区間制約は θ には適用しません。asin への単純置換、相対位相の省略、Rz(θ) のみへの置換、状態全体の -1 倍はいずれも不合格です。P と Rz の違いは全体位相 exp(−iθ/2) です。

上流 Verification.qs は β=sin(i) の負の例も生成し、任意状態の本文 β≥0 と矛盾します。PB は本文に従い、回転状態の符号付き β と区別します。過去の固定値版は変更しません。角度再パラメータ化と閉区間は課題の契約であり、数値標本ではありません。

## 研究試行と過去結果

外部で作った JSON 解答は `qni research record --submissions <JSONディレクトリ>` により、独立したプロトコルとして保存できます。数値版と記号版を1試行へ混ぜないでください。既存 `--circuit-json-dir` の変換は旧プロトコル専用です。`qni research solve` への新形式の統合は未対応で、誤って旧形式の回答を要求しないよう明示エラーにします。

ADR 0019 に従い、過去の `result.json` を再採点・変換しません。旧 `blind-neutral-circuit-json-v1` / `qni-command-output-v0` と本形式は別枠で比較します。
